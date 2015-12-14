module.exports = function (grunt) {
  global.grunt = grunt;
  grunt.initConfig({
    jsdoc : {
      dist : {
        src: ['lib/**/*.js'],
        options: {
          destination: 'doc',
          template : "jsdocTemplate",
          configure : "jsdoc.conf.json"
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-jsdoc');
  grunt.registerTask('default', ['jsdoc']);

};
