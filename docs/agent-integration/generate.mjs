import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { CONTENT_REVISION, LOCALES, SUPPORTED_HOSTS, CLI_TASK_IDS, TROUBLESHOOTING_IDS, INSTALL_COMMAND, INSTALL_NOTES, getLocalizedContent, getHostContent, getCliExample, getTroubleshootingGuide } from './content.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const app = 'excalidraw/apps/image-board-desktop/';
const check = process.argv.includes('--check');
const escape = (s) => String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const para = (s) => `<p>${escape(s)}</p>`;
const list = (values) => `<ol>${values.map(v=>`<li>${escape(v)}</li>`).join('')}</ol>`;
const output = async (file, text) => {
  const path = resolve(root,file);
  if (check) {
    if (await readFile(path,'utf8').catch(()=>null) !== text) throw new Error(`接入内容未生成或被手改：${file}；运行 node docs/agent-integration/generate.mjs`);
  } else await writeFile(path,text);
};
await output('website/integrations-content.mjs', '// 自动生成，请修改 docs/agent-integration/content.mjs。\n'+await readFile(resolve(root,'docs/agent-integration/content.mjs'),'utf8'));
let markdown = '# CoreStudio 本地 Agent 集成使用说明\n\n<!-- 自动生成：node docs/agent-integration/generate.mjs；禁止直接编辑 -->\n\n';
for (const locale of LOCALES) {
  const c = getLocalizedContent(locale), h = getHostContent({locale});
  const zh = locale === 'zh-CN';
  const section = (id, body) => `<section class="guide-section" id="${id}"><h2>${escape(c.sectionCopy[id].title)}</h2><p class="section-intro">${escape(c.sectionCopy[id].intro)}</p>${body}</section>`;
  const code = (id,value,attr='') => `<div class="code-block"><code id="${id}" ${attr}>${escape(value)}</code><button class="copy-button" type="button" data-copy-target="#${id}">${escape(c.labels.copy)}</button></div>`;
  const setup = Object.keys(c.hostSetup).map(host=>{
    const entry=getHostContent({host,locale}), s=entry.setup;
    return `<article data-host-setup="${host}"><h3>${escape(entry.name)}</h3>${para(s.browser)}${list(s.steps)}${para(s.images)}</article>`;
  }).join('');
  const troubleshooting = TROUBLESHOOTING_IDS.map(symptom=>{
    const t=getTroubleshootingGuide({host:'codex',locale,symptom});
    return `<details class="troubleshooting-item"><summary>${escape(t.diagnosis)}</summary><div class="troubleshooting-body">${list(t.actions)}${para(t.verification)}</div></details>`;
  }).join('');
  const html = `<section class="guide-hero" id="overview"><h1>${escape(c.hero.title)}</h1><p class="hero-intro">${escape(c.hero.intro)}</p><div class="guide-status">${escape(c.hero.localNote)}</div></section><dl class="fact-ledger">${Object.values(c.facts).map(f=>`<div><dt>${escape(f.label)}</dt><dd>${escape(f.value)}</dd></div>`).join('')}</dl>`+
  section('install', `<ol class="installation-steps">${c.installSteps.map(s=>`<li><div><h3>${escape(s.title)}</h3>${para(s.body)}</div></li>`).join('')}</ol>${code('install-agent-command',INSTALL_COMMAND)}${para(INSTALL_NOTES[locale])}`)+
  `<section class="guide-section" data-host-setups><h2>${zh?'Agent 接入说明':'Agent connection guide'}</h2>${setup}</section>`+
  section('verify', `<div class="verification-grid">${['install','connection'].map(k=>`<div class="verification-block"><h3>${escape(c.verify[k+'Title'])}</h3>${para(c.verify[k+'Body'])}${code('verify-'+k+'-command',c.verify[k+'Command'])}</div>`).join('')}</div>`)+
  section('first-use', `${code('first-agent-prompt',h.prompt,'data-first-prompt')}<p class="host-note" data-host-note>${escape(h.note)}</p>`)+
  section('cli', `<div class="cli-table">${CLI_TASK_IDS.map(task=>{const t=getCliExample({task,locale});return `<div class="cli-row" data-cli-task="${task}"><h3>${escape(t.purpose)}</h3><div class="cli-command"><code>${escape(t.command)}</code><span class="session-requirement" data-session-requirement ${t.requiresAgentSession?'':'hidden'}>Agent session</span></div></div>`;}).join('')}</div><a class="contract-link" href="${c.cliContractUrl}">${escape(c.labels.fullContract)}</a>`)+
  section('troubleshooting', `<div class="troubleshooting-list" data-troubleshooting-list>${troubleshooting}</div><noscript>${para(c.noScript)}</noscript><a class="source-link" href="${c.sourceUrl}">${escape(c.labels.source)}</a>`);
  const file = zh?'website/zh/integrations/index.html':'website/integrations/index.html';
  let page=await readFile(resolve(root,file),'utf8');
  page=page.replace(/(<main\b[^>]*>)[\s\S]*?(<\/main>)/,`$1\n<!-- 自动生成的接入正文 -->\n${html}\n$2`).replace(/data-content-revision="[^"]+"/,`data-content-revision="${CONTENT_REVISION}"`);
  await output(file,page);
  markdown+=`## ${c.language}\n\n${c.hero.title}\n\n${c.hero.intro}\n\n`;
  markdown+=c.installSteps.map(s=>`### ${s.title}\n\n${s.body}\n`).join('\n');
  markdown+=`\n\`\`\`sh\n${INSTALL_COMMAND}\n\`\`\`\n\n${INSTALL_NOTES[locale]}\n\n`;
  for(const host of SUPPORTED_HOSTS){const t=getHostContent({host,locale});markdown+=`### ${t.name}\n\n${t.note}\n\n${t.setup?[...t.setup.steps,t.setup.images].join('\n\n'):''}\n\n${t.prompt}\n\n`;}
  for(const k of ['install','connection'])markdown+=`### ${c.verify[k+'Title']}\n\n${c.verify[k+'Body']}\n\n\`${c.verify[k+'Command']}\`\n\n`;
  for(const task of CLI_TASK_IDS){const t=getCliExample({task,locale});markdown+=`${t.purpose}\n\n\`\`\`sh\n${t.command}\n\`\`\`\n\n`;}
  for(const symptom of TROUBLESHOOTING_IDS){const t=getTroubleshootingGuide({locale,symptom});markdown+=`### ${t.diagnosis}\n\n${t.actions.join('\n\n')}\n\n${t.doNot.join('\n\n')}\n\n${t.verification}\n\n`;}
}
markdown+='## 完整工作流与宿主参考\n\n'+await readFile(resolve(root,'docs/agent-integration/workflows.md'),'utf8');
for (const host of ['workbuddy','qwenwork','doubaowork']) markdown+='\n\n'+await readFile(resolve(root,app+`resources/agent-integration/hosts/${host}.md`),'utf8');
await output(app+'docs/agent-integration-user-guide.md',markdown);
await output(app+'resources/agent-integration/USER_GUIDE.md',markdown);
await output('docs/codex-integration.md', '# CoreStudio Codex 集成安装指南\n\n<!-- 自动生成，安装流程与其他宿主共用；请选择 codex 参数。 -->\n\n'+markdown);
console.log(check?'接入内容生成一致性检查通过':'已生成官网模块、中英文页面、仓库指南和随包指南');
