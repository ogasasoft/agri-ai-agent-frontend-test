// カスタムESLintルール：エラーハンドリング必須化
module.exports = {
  rules: {
    // シンプルなエラーレスポンスを禁止
    'no-simple-error-responses': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Disallow simple error responses without ErrorBuilder',
          category: 'Possible Errors',
          recommended: true
        },
        fixable: 'code',
        schema: []
      },
      create(context) {
        return {
          ReturnStatement(node) {
            // NextResponse.json() でのシンプルエラーレスポンスを検出
            if (
              node.argument &&
              node.argument.type === 'CallExpression' &&
              node.argument.callee &&
              node.argument.callee.type === 'MemberExpression' &&
              node.argument.callee.object &&
              node.argument.callee.object.name === 'NextResponse' &&
              node.argument.callee.property &&
              node.argument.callee.property.name === 'json'
            ) {
              const firstArg = node.argument.arguments[0];
              const secondArg = node.argument.arguments[1];

              // エラー状態（status >= 400）をチェック
              if (
                secondArg &&
                secondArg.type === 'ObjectExpression' &&
                secondArg.properties.some(prop =>
                  prop.key.name === 'status' &&
                  prop.value.type === 'Literal' &&
                  prop.value.value >= 400
                )
              ) {
                // ErrorBuilderが使用されているかチェック
                if (
                  !firstArg ||
                  firstArg.type !== 'Identifier' ||
                  !context.getScope().variables.some(variable =>
                    variable.name.includes('Error') && variable.name.includes('Builder')
                  )
                ) {
                  context.report({
                    node: node.argument,
                    message: 'Use ErrorBuilder classes instead of simple error responses. Import AuthErrorBuilder, DatabaseErrorBuilder, or ExternalAPIErrorBuilder.',
                    fix(fixer) {
                      return fixer.replaceText(
                        firstArg,
                        'new ErrorBuilder("エラーが発生しました", "GENERAL_ERROR").build()'
                      );
                    }
                  });
                }
              }
            }
          }
        };
      }
    },

    // ErrorBuilderのインポートを必須化
    'require-error-builders': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Require ErrorBuilder imports in API routes',
          category: 'Best Practices',
          recommended: true
        },
        schema: []
      },
      create(context) {
        const filename = context.getFilename();

        // API routeファイルのみをチェック
        if (!filename.includes('/api/') || !filename.endsWith('route.ts')) {
          return {};
        }

        let hasErrorBuilderImport = false;
        let hasErrorHandling = false;

        return {
          ImportDeclaration(node) {
            if (
              node.source.value.includes('error-details') ||
              node.specifiers.some(spec =>
                spec.imported && spec.imported.name.includes('ErrorBuilder')
              )
            ) {
              hasErrorBuilderImport = true;
            }
          },

          TryStatement(node) {
            hasErrorHandling = true;
          },

          'Program:exit'() {
            if (hasErrorHandling && !hasErrorBuilderImport) {
              context.report({
                node: context.getSourceCode().ast,
                message: 'API routes with error handling must import ErrorBuilder classes. Add: import { AuthErrorBuilder } from "@/lib/auth-error-details";'
              });
            }
          }
        };
      }
    },

    // Error Boundaryの使用を推奨
    'require-error-boundaries': {
      meta: {
        type: 'suggestion',
        docs: {
          description: 'Recommend ErrorBoundary usage in page components',
          category: 'Best Practices',
          recommended: false
        },
        schema: []
      },
      create(context) {
        const filename = context.getFilename();

        // page.tsxファイルのみをチェック
        if (!filename.includes('page.tsx')) {
          return {};
        }

        let hasErrorBoundaryImport = false;
        let hasErrorBoundaryUsage = false;

        return {
          ImportDeclaration(node) {
            if (
              node.specifiers.some(spec =>
                spec.imported && spec.imported.name === 'ErrorBoundary'
              )
            ) {
              hasErrorBoundaryImport = true;
            }
          },

          JSXElement(node) {
            if (
              node.openingElement.name &&
              node.openingElement.name.name === 'ErrorBoundary'
            ) {
              hasErrorBoundaryUsage = true;
            }
          },

          'Program:exit'() {
            if (!hasErrorBoundaryImport || !hasErrorBoundaryUsage) {
              context.report({
                node: context.getSourceCode().ast,
                message: 'Consider wrapping page components with ErrorBoundary for better error handling. Import from "@/components/ErrorBoundary".',
                severity: 1 // warning
              });
            }
          }
        };
      }
    },

    // console.errorの単独使用を警告
    'no-console-error-only': {
      meta: {
        type: 'suggestion',
        docs: {
          description: 'Discourage console.error without structured error handling',
          category: 'Best Practices',
          recommended: true
        },
        schema: []
      },
      create(context) {
        return {
          CallExpression(node) {
            if (
              node.callee &&
              node.callee.type === 'MemberExpression' &&
              node.callee.object &&
              node.callee.object.name === 'console' &&
              node.callee.property &&
              node.callee.property.name === 'error'
            ) {
              // catch block内でconsole.errorのみの場合を警告
              let parent = node.parent;
              while (parent) {
                if (parent.type === 'CatchClause') {
                  const catchBody = parent.body.body;
                  if (
                    catchBody.length === 1 &&
                    catchBody[0].type === 'ExpressionStatement' &&
                    catchBody[0].expression === node
                  ) {
                    context.report({
                      node,
                      message: 'Consider using ErrorBuilder classes for structured error handling instead of console.error only.'
                    });
                  }
                  break;
                }
                parent = parent.parent;
              }
            }
          }
        };
      }
    },

    // useErrorHandlerの使用を推奨（React components）
    'recommend-error-handler-hooks': {
      meta: {
        type: 'suggestion',
        docs: {
          description: 'Recommend useErrorHandler hooks in React components',
          category: 'Best Practices',
          recommended: false
        },
        schema: []
      },
      create(context) {
        const filename = context.getFilename();

        // React componentファイルのみをチェック
        if (!filename.includes('.tsx') || filename.includes('page.tsx')) {
          return {};
        }

        let hasUseErrorHandlerImport = false;
        let hasErrorHandling = false;

        return {
          ImportDeclaration(node) {
            if (
              node.source.value.includes('useErrorHandler') ||
              node.specifiers.some(spec =>
                spec.imported && (
                  spec.imported.name.includes('useErrorHandler') ||
                  spec.imported.name.includes('useFormErrorHandler') ||
                  spec.imported.name.includes('useApiErrorHandler')
                )
              )
            ) {
              hasUseErrorHandlerImport = true;
            }
          },

          TryStatement(node) {
            hasErrorHandling = true;
          },

          CallExpression(node) {
            // fetch API の使用を検出
            if (
              node.callee &&
              node.callee.name === 'fetch'
            ) {
              hasErrorHandling = true;
            }
          },

          'Program:exit'() {
            if (hasErrorHandling && !hasUseErrorHandlerImport) {
              context.report({
                node: context.getSourceCode().ast,
                message: 'Consider using useErrorHandler hooks for consistent error handling. Import from "@/hooks/useErrorHandler".',
                severity: 1 // warning
              });
            }
          }
        };
      }
    }
  }
};