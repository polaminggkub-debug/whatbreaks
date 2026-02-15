import { Project } from 'ts-morph';
import path from 'node:path';
import fs from 'node:fs';
import { extractFromSourceFile } from './importParser.js';
import type { ParsedFile } from './importParser.js';

/**
 * Extract the content of the <script> or <script setup> block from a .vue file.
 * Returns the script content and whether it uses TypeScript (lang="ts").
 */
function extractScriptBlock(
  vueContent: string,
): { content: string; isSetup: boolean } | null {
  // Match <script setup ...> or <script ...> blocks
  // Prioritize <script setup> over <script>
  const scriptSetupRegex =
    /<script\s+[^>]*setup[^>]*>([\s\S]*?)<\/script>/i;
  const scriptRegex =
    /<script(?:\s+[^>]*)?\s*>([\s\S]*?)<\/script>/i;

  const setupMatch = vueContent.match(scriptSetupRegex);
  if (setupMatch) {
    return { content: setupMatch[1], isSetup: true };
  }

  const scriptMatch = vueContent.match(scriptRegex);
  if (scriptMatch) {
    return { content: scriptMatch[1], isSetup: false };
  }

  return null;
}

/**
 * Parse a .vue file by extracting its script block and analyzing it
 * with ts-morph for imports and exports.
 */
export function parseVueFile(
  filePath: string,
  projectRoot: string,
): ParsedFile {
  const absolutePath = path.resolve(projectRoot, filePath);
  const currentFileDir = path.dirname(absolutePath);

  const vueContent = fs.readFileSync(absolutePath, 'utf-8');
  const scriptBlock = extractScriptBlock(vueContent);

  if (!scriptBlock) {
    // No script block found — return empty
    return {
      filePath: filePath.split(path.sep).join('/'),
      imports: [],
      exports: [],
    };
  }

  const project = new Project({
    compilerOptions: {
      allowJs: true,
      jsx: 1, // JsxEmit.Preserve — handle TSX-like patterns in script setup
    },
    skipAddingFilesFromTsConfig: true,
  });

  // Create a virtual .ts source file from the extracted script content
  const virtualFileName = absolutePath.replace('.vue', '.__vue_script__.ts');
  const sourceFile = project.createSourceFile(
    virtualFileName,
    scriptBlock.content,
    { overwrite: true },
  );

  const { imports, exports } = extractFromSourceFile(
    sourceFile,
    currentFileDir,
    projectRoot,
  );

  // For <script setup>, all top-level bindings are implicitly exported
  // but we only track explicit exports for graph purposes
  // Add the component itself as an export (the .vue file's default export)
  const componentName = path.basename(filePath, '.vue');
  const allExports = [componentName, ...exports];

  return {
    filePath: filePath.split(path.sep).join('/'),
    imports,
    exports: allExports,
  };
}
