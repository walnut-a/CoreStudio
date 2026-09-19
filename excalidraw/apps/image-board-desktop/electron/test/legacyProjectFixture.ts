import fs from "node:fs/promises";
import path from "node:path";
import { createProjectStructure } from "../projectFs";

// Keep the original format's regression suite; v2 has separate filesystem integration tests.
export const createLegacyProjectStructure: typeof createProjectStructure =
  async (parent, name) => {
    const result = await createProjectStructure(parent, name);
    const file = path.join(result.projectPath, "project.json");
    const document = JSON.parse(await fs.readFile(file, "utf8"));
    await fs.writeFile(
      path.join(result.projectPath, "image-records.json"),
      JSON.stringify(document.imageRecords ?? {}),
    );
    delete document.imageRecords;
    document.formatVersion = 1;
    document.imageRecordsFile = "image-records.json";
    await fs.writeFile(file, JSON.stringify(document));
    return { ...result, project: document };
  };
