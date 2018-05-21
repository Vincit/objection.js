module.exports = {
  title: 'Objection.js',
  description: 'An SQL friendly ORM for node.js',

  themeConfig: {
    repo: 'vincit/objection.js',
    repoLabel: 'Github',

    nav: [
      {
        text: 'Guide',
        link: '/guide/installation',
      },

      {
        text: 'API Reference',
        link: '/api/model',
      },

      {
        text: 'Recipe Book',
        link: '/recipes/raw-queries',
      }
    ],

    sidebar: {
      '/guide/': [{
        title: 'Guide',
        collapsable: false,
        children: [
          'installation',
          'getting-started',
          'models',
          'relations',
          'query-examples',
          'transactions',
          'validation',
          'documents',
          'plugins',
          'contributing'
        ]
      }],

      '/api/': [{
        title: 'API Reference',
        collapsable: false,
        children: [
          'objection',
          'model',
          'query-builder',
          'types'
        ]
      }],

      '/recipes/': [{
        title: 'Recipes',
        collapsable: false,
        children: [
          'raw-queries'
        ]
      }]
    }
  },

  markdown: {
    config: md => {
      const regex = /multi-language (.*)/;

      md.use(require('markdown-it-container'), 'multi-language', {
        render(tokens, idx) {
          let argString;

          try {
            const matched = tokens[idx].info.trim().match(regex);
            argString = matched[1];
          } catch (e) {
            return tokens[idx].info.trim();
          }

          const args = argString.split(/\s+/);

          switch (args[0]) {
            case 'example': {
              switch (args[1]) {
                case 'begin': {
                  return `<tabbed-example>`;
                }

                case 'end': {
                  return `</tabbed-example>`;
                }

                default: {
                  throw new Error(`Failed to parse line "${tokens[idx].info}"`);
                }
              }
            }

            case 'section': {
              const tabTitle = args[1];

              switch (args[2]) {
                case 'begin': {
                  return `<tab name="${tabTitle}">`;
                }

                case 'end': {
                  return `
                        </tab>
                  `;
                }

                default: {
                  throw new Error(`Failed to parse line "${tokens[idx].info}"`);
                }
              }
            }
          }

          return `
            <pre class="language-json">
              ${JSON.stringify(args)}
            </pre>
          `;
        }
      });
    }
  }
};
