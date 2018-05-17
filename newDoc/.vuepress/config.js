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
          'documents'
        ]
      }],

      '/api/': [{
        title: 'API Reference',
        collapsable: false,
        children: [
          'model',
          'query-builder'
        ]
      }]
    }
  }
}
