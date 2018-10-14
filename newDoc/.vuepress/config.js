module.exports = {
  title: 'Objection.js',
  description: 'An SQL friendly ORM for node.js',

  themeConfig: {
    repo: 'vincit/objection.js',
    repoLabel: 'Github',

    nav: [
      {
        text: 'Guide',
        link: '/guide/installation'
      },

      {
        text: 'API Reference',
        link: '/api/'
      },

      {
        text: 'Recipe Book',
        link: '/recipes/raw-queries'
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
            'validation',
            'documents',
            'plugins',
            'contributing'
          ]
        }
      ],

      '/api/': [
        {
          title: 'API Reference',
          collapsable: false,
          children: ['objection', 'model', 'query-builder', 'types']
        }
      ],

      '/recipes/': [
        {
          title: 'Recipes',
          collapsable: false,
          children: [
            'raw-queries',
            'json-queries',
            'custom-id-column',
            'custom-validation',
            'snake-case-to-camel-case-conversion',
            'paging',
            'subqueries',
            'relation-subqueries',
            'joins',
            'returning-tricks',
            'timestamps',
            'custom-query-builder',
            'multitenancy-using-multiple-databases',
            'precedence-and-parentheses',
            'default-values',
            'composite-keys',
            'error-handling',
            'ternary-relationships',
            'indexing-postgresql-jsonb-columns'
          ]
        }
      ]
    }
  }
};
