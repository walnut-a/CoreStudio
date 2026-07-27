# CoreStudio 测试执行与进程生命周期治理

## 当前目标

在不改变 CoreStudio 产品行为、正式验证顺序和发版语义的前提下，把桌面全量测试收敛为一套默认一次性、资源有界、互斥运行、可取消且可复查的执行流程，并保留明确的交互式 watch 入口。

## 事故根因

2026-07-27 的测试事故由三层缺口叠加造成：

1. `test:desktop` 直接调用 `vitest apps/image-board-desktop`，默认运行模式没有在入口处固定为一次性 `run`。
2. 全量测试没有 worker 上限和仓库级运行锁；长命令返回 session/cell ID 后，执行方误把“仍在运行”当成“已经结束”，又启动了第二套全量 Vitest。
3. 停止任务时只终止了上层命令，没有由测试入口负责终止自己拥有的完整进程组，也没有在退出后复查残留，最终留下被重新托管到 `PPID=1` 的 worker。

## 范围

本轮包含：

- 统一桌面测试 Node runner；
- 一次性、watch、CI 命令入口；
- worker 上限与显式环境变量覆盖；
- 仓库级全量测试锁、stale lock 恢复和显式并发 override；
- 正常退出、失败、信号、超时及 runner 异常退出时的进程组清理；
- runner、锁、命令构造、fixture 生命周期和 CI workflow 合同测试；
- 仓库级长任务执行协议；
- 2/4 worker 基线和最终完整测试的时间、峰值内存、残留进程证据。

本轮不包含：

- 产品业务行为修改；
- Electron UI 验收；
- 构建、打包、公证、发布；
- 提交、推送或 PR。

## 设计决策

### 单一 runner

根 `package.json` 中的桌面测试命令只负责进入
`apps/image-board-desktop/scripts/run-desktop-tests.mjs`。runner 统一构造 Vitest
命令、获取锁、打印运行身份、启动测试、转发信号、执行超时和收尾。

### 进程所有权

- POSIX：Vitest 主进程以独立进程组启动，只向该 PGID 发送信号。
- Windows：只对已记录的 Vitest 主 PID 使用 `taskkill /PID <pid> /T`。
- 不使用 `killall node`、宽泛 `pkill` 或按进程名清理全机 Node。
- runner 启动独立 watchdog，并通过仅由 runner 持有的管道判断 runner 是否异常消失；即使 runner 被直接终止，watchdog 也只清理该次运行记录的进程组和锁。

`tree-kill` 当前只是 `concurrently` 的传递依赖，其 POSIX 实现依赖逐级枚举后再发送信号，无法像独立进程组一样覆盖枚举与退出之间的竞态，也不适合作为本轮锁和 watchdog 的基础。因此本轮不增加新的运行时依赖。

### 运行锁

锁位于 Git common dir，确保同一 Git 仓库的不同 worktree 默认也不能并行启动两套全量桌面测试。锁记录：

- schema 版本；
- 仓库身份与当前 worktree；
- runner PID；
- Vitest PID/PGID（启动后补充）；
- 模式、worker 上限、启动时间和随机 run ID。

获取锁使用原子创建。锁中 PID 不存在或锁内容无效时按 stale lock 恢复；活跃锁快速失败并给出 PID、启动时间和退出方式。只有
`CORESTUDIO_TEST_ALLOW_CONCURRENT=1` 会显式绕过互斥。

### 资源边界

- 2/4 worker 使用同一测试范围和 `dot` reporter 串行实测后，4 worker
  比 2 worker 慢 7.1%，进程组峰值 RSS 高 48.3%。这是采用 4 的相反证据，
  因此默认上限采用 2。
- `CORESTUDIO_TEST_MAX_WORKERS=<positive integer>` 可显式覆盖。
- `CORESTUDIO_TEST_TIMEOUT_MS=<milliseconds>` 可覆盖全量测试超时。
- 默认 `test:desktop` 使用 Vitest `run`；watch 只通过 `test:desktop:watch` 进入。

## TDD 与执行阶段

1. 记录当前进程、命令、CI 和正式验证顺序；顺序执行 2/4 worker 基线，禁止并发。
2. 先添加 runner/锁/命令构造及 fixture 生命周期测试，确认当前实现缺失而失败。
3. 完成最小 runner、watchdog、package scripts、CI 和执行协议改动。
4. 验证单元测试、stale lock、重复启动、SIGINT/SIGTERM/超时/runner 异常退出。
5. 运行受影响的定向 Vitest 和 `test:typecheck`。
6. 最终只运行一次新的完整 `test:desktop`，随后按 cwd、PID、PPID、PGID、命令行精确复查残留。

## 当前基线

- 机器内存：32 GiB。
- Node：v22.23.1；Yarn：1.22.22。
- 调整前 `test:desktop`：`vitest apps/image-board-desktop`。
- 调整前 worker 上限：未显式配置。
- 调整前 CI desktop tests：`corepack yarn test:desktop --run`。
- 开始本轮工作时，没有发现命令行关联本仓库的 Vitest / vite-node 进程。
- 工作区已有与本任务无关的产品改动；本轮不覆盖、不暂存、不提交这些改动。

## 验证记录

### TDD 红灯

新增命令合同、runner/锁单元测试和 fixture 生命周期测试后，先运行目标测试：

- 现有 `test:desktop` 仍直接调用 Vitest，命令、watch、CI 和执行协议 4 项合同失败；
- `desktopTestRunner.mjs` 尚不存在，runner 单元测试无法加载；
- runner 尚不存在，SIGINT、SIGTERM、直接终止 runner、超时、失败退出、重复启动和 stale lock 的真实进程场景均失败。

实现后，runner/锁/命令、生命周期、现有 CI workflow 和 packaging workflow
定向回归共 5 个文件、30 项测试通过。生命周期套件覆盖 8 个场景：

- SIGINT；
- SIGTERM；
- runner 被直接 `SIGKILL`；
- 超时；
- 子命令失败；
- 子命令成功但仍有存活子进程；
- 重复全量启动；
- stale lock 恢复。

### 2/4 worker 基线

两次基线均在实现前串行执行，使用同一命令范围和 `dot` reporter，并按独立
PGID 每 200 ms 采样进程组总 RSS：

| worker 上限 | 测试 | Vitest 时间 | runner 墙钟 | 峰值进程组 RSS | 峰值进程数 |
| --- | --- | --- | --- | --- | --- |
| 2 | 235 files / 1809 tests | 105.08 s | 105.765 s | 751.5 MiB | 7 |
| 4 | 235 files / 1809 tests | 111.94 s | 113.292 s | 1114.2 MiB | 9 |

4 worker 相比 2 worker 墙钟增加约 7.1%，峰值 RSS 增加约 48.3%，因此默认采用 2。

### 取消与清理

真实取消验收使用统一 runner 启动两层 fixture：

- runner PID/PGID：`87630/87630`；
- supervisor PID/PGID：`88383/88383`；
- fixture 主 PID/PGID：`88392/88392`；
- fixture leaf PID/PGID：`88414/88392`；
- runner 和 fixture cwd：
  `/Users/zhaolixing/GitHub/工业设计助手/excalidraw`。

只向 runner PID 发送 `SIGTERM` 后，supervisor 输出：

```text
cleanup=complete reason=runner-SIGTERM termSent=true killSent=false remaining=0 lockReleased=true
```

随后按上述 4 个 PID、PGID `88392`、仓库内 runner/supervisor/fixture 完整命令路径和锁文件复查，均无残留。

另一次 10 秒 fixture 验证了 timeout 路径：

```text
cleanup=complete reason=timeout termSent=true killSent=false remaining=0 lockReleased=true
```

### 正式验证

- `corepack yarn test:typecheck --pretty false`：通过，51.54 s。
- 最终只执行一次新的 `corepack yarn test:desktop`：
  239 个文件、1836 项测试全部通过；Vitest 234.57 s；runner 235.917 s；
  峰值进程组 RSS 705.9 MiB；峰值进程数 7。
- 完整测试主 PID/PGID：`94203/94203`。正常结束输出
  `cleanup=complete`、`remaining=0`、`lockReleased=true`。
- 完整测试后按 runner PID `94164`、测试 PGID `94203`、本仓库 Vitest 和
  supervisor 完整命令路径、`PPID=1` 的 Vitest/vite-node/tinypool 以及
  Git common dir 运行锁复查，均无残留。
- `git diff --check`：通过。

最终完整测试使用 Vitest 默认 reporter，且并发工作区在基线后又增加了测试，
因此其 235.917 s 不与前面的受控 2/4 worker `dot` reporter 基线直接比较。

## 当前限制

- macOS/POSIX 的独立进程组、信号和 supervisor 断连清理已真实验证；Windows
  使用精确 `taskkill /PID <pid> /T` 的分支只有单元合同，没有本轮实机验证。
- 操作系统无法让进程捕获发给 supervisor 自身的 `SIGKILL`。当前架构能处理
  runner 被直接杀死、runner 收到常规取消信号以及测试超时；若外部执行器同时
  对 runner、supervisor 和测试进程无条件发送 `SIGKILL`，只能依赖执行器自身的
  完整进程树清理。
- 锁通过 runner/supervisor/test 三个 PID 判断活性，并记录启动时间和仓库身份；
  极端 PID 快速复用仍可能造成一次保守的活跃锁判断。旧 owner 全部不存在时会
  自动恢复 stale lock。
- 进程组峰值 RSS 采样目前依赖 POSIX `ps`；Windows 仍能执行生命周期治理，但
  runner 不提供同等的 RSS 指标。
