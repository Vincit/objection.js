module.exports = {
  watch: {
    $page(newPage, oldPage) {
      // Hack to make links with a hash scroll when they are called
      // the first time. https://github.com/vuejs/vuepress/issues/1499
      if (newPage.key !== oldPage.key) {
        requestAnimationFrame(() => {
          if (this.$route.hash) {
            const element = document.getElementById(this.$route.hash.slice(1));

            if (element && element.scrollIntoView) {
              element.scrollIntoView();
            }
          }
        });
      }
    }
  }
};
