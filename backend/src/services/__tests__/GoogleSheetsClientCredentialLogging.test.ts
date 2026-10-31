/**
 * Offline-only credential logging regression.
 * This suite never loads secrets, calls Google, or changes any records.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import ts from 'typescript';

const source = readFileSync(resolve(__dirname, '../GoogleSheetsClient.ts'), 'utf8');
const publicApiSource = readFileSync(resolve(__dirname, '../../../api/src/services/GoogleSheetsClient.ts'), 'utf8');
const ast = ts.createSourceFile('GoogleSheetsClient.ts', source, ts.ScriptTarget.ES2020, true);
const names = new Set([
  'authenticate',
  'authenticateWithServiceAccountJson',
  'authenticateWithServiceAccountFile',
  'authenticateWithServiceAccountEnv',
]);

function authConsoleArguments(): Array<{ method: string; args: string }> {
  const results: Array<{ method: string; args: string }> = [];
  function visit(node: ts.Node): void {
    if (ts.isMethodDeclaration(node) && names.has(node.name.getText(ast))) {
      const method = node.name.getText(ast);
      function inspect(n: ts.Node): void {
        if (ts.isCallExpression(n) &&
          /^console\.(?:log|error|warn|debug|info)$/.test(n.expression.getText(ast))) {
          results.push({ method, args: n.arguments.map(arg => arg.getText(ast)).join(', ') });
        }
        ts.forEachChild(n, inspect);
      }
      if (node.body) inspect(node.body);
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  return results;
}

describe('GoogleSheetsClient credentials never appear in auth logs', () => {
  test('every credential authentication path exists', () => {
    for (const method of names) {
      expect(source).toContain(method + '(');
    }
  });

  test('authentication logs contain only fixed, safe strings', () => {
    for (const { method, args } of authConsoleArguments()) {
      expect(args).toMatch(/^['"][^'"]*['"]$/);
      expect(args).not.toMatch(/private_key|privateKey|client_email|jsonString|encodedOrJson|keyFile|keyPath|secret|token/i);
    }
  });

  test('previous raw and decoded credential excerpts have been removed', () => {
    expect(source).not.toMatch(/(?:First|Last|Decoded first|Decoded last)\s+\d+\s+chars:/i);
    expect(source).not.toMatch(/\bfirst50\b|\blast50\b/i);
    expect(source).not.toMatch(/\b(?:jsonString|encodedOrJson|privateKey)\.substring\(/);
    expect(source).not.toMatch(/console\.(?:error|log|warn)\([^\n]*client_email:/);
    expect(source).not.toMatch(/console\.(?:error|log|warn)\([^\n]*private_key_id:/);
    expect(source).not.toMatch(/JSON parse error:[^\n]*parseError/);
  });

  test('public API never forwards raw Google auth exceptions or local credential file paths', () => {
    expect(publicApiSource).not.toContain('Google Sheets authentication failed: ${error.message}');
    expect(publicApiSource).not.toContain('Service account key file not found: ${keyPath}');
    expect(publicApiSource).toContain("throw new Error('Google Sheets authentication failed')");
  });

  test('all credential formats and Google Sheets/Drive auth scopes are retained', () => {
    expect(source).toContain('JSON.parse(encodedOrJson)');
    expect(source).toContain("Buffer.from(encodedOrJson, 'base64').toString('utf8')");
    expect(source).toContain('keyFile.private_key.replace(');
    expect(source).toContain('await this.authenticateWithServiceAccountEnv()');
    expect(source).toContain('await this.authenticateWithServiceAccountFile()');
    expect(source).toContain('await this.authenticateWithOAuth()');
    expect(source).toContain("scopes: ['https://www.googleapis.com/auth/spreadsheets']");
    expect(source).toContain("'https://www.googleapis.com/auth/drive.readonly'");
    expect(source).toContain('await this.auth.authorize()');
  });
});
