module.exports = {
  title: 'Objection.js',
  description: 'An SQL friendly ORM for node.js',
  base: '/objection.js/',

  themeConfig: {
    repo: 'vincit/objection.js',
    repoLabel: 'GitHub',

    algolia: {
      apiKey: '8b9b4ac9f68d11c702e8102479760861',
      indexName: 'vincit_objectionjs'
    },

    nav: [
      {
        text: 'Guide',
        link: '/guide/'
      },

      {
        text: 'API Reference',
        items: [
          {
            text: 'Main Module',
            link: '/api/objection/'
          },
          {
            text: 'Query Builder',
            link: '/api/query-builder/'
          },
          {
            text: 'Model',
            link: '/api/model/'
          },
          {
            text: 'Types',
            link: '/api/types/'
          }
        ]
      },

      {
        text: 'Recipe Book',
        link: '/recipes/'
      },

      {
        text: 'Release Notes',
        items: [
          {
            text: 'Changelog',
            link: '/release-notes/changelog.md'
          },
          {
            text: 'Migration to 2.0',
            link: '/release-notes/migration.md'
          },
          {
            text: 'v1.x documentation',
            link: 'https://github.com/Vincit/objection.js/tree/v1/doc'
          }
        ]
      },

      {
        text: '⭐ Star',
        link: 'https://github.com/vincit/objection.js'
      }
    ],

    sidebar: {
      '/guide/': [
        {
          title: 'Guide',
          collapsable: false,
          children: [
            'installation',
            'getting-started',
            'models',
            'relations',
            'query-examples',
            'transactions',
            'hooks',
            'validation',
            'documents',
            'plugins',
            'contributing'
          ]
        }
      ],

      '/api/model/': [
        {
          title: 'Model API Reference',
          collapsable: false,
          children: [
            'overview',
            'static-properties',
            'static-methods',
            'instance-methods'
          ]
        }
      ],

      '/api/objection/': [
        {
          title: 'Objection API Reference',
          collapsable: false
        }
      ],

      '/api/query-builder/': [
        {
          title: 'Query Builder API Reference',
          collapsable: false,
          children: [
            'find-methods',
            'mutate-methods',
            'eager-methods',
            'join-methods',
            'other-methods',
            'static-methods'
          ]
        }
      ],

      '/recipes/': [
        {
          title: 'Recipes',
          collapsable: false,
          children: [
            'raw-queries',
            'precedence-and-parentheses',
            'subqueries',
            'relation-subqueries',
            'joins',
            'modifiers',
            'composite-keys',
            'polymorphic-associations',
            'json-queries',
            'custom-id-column',
            'extra-properties',
            'custom-validation',
            'snake-case-to-camel-case-conversion',
            'paging',
            'returning-tricks',
            'timestamps',
            'custom-query-builder',
            'multitenancy-using-multiple-databases',
            'default-values',
            'error-handling',
            'ternary-relationships',
            'indexing-postgresql-jsonb-columns'
          ]
        }
      ]
    }
  }
};
