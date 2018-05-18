<template>
  <div class="tabbed-example">
    <ul role="tablist" class="tabbed-example-tabs">
      <li
        v-for="(tab, i) in tabs"
        :key="i"
        :class="{ 'is-active': tab.isActive, 'is-disabled': tab.isDisabled }"
        class="tabbed-example-tab"
        role="presentation"
        v-show="tab.isVisible"
      >
        <a
          v-html="tab.header"
          :aria-controls="tab.hash"
          :aria-selected="tab.isActive === activeTabHash"
          @click="selectTab(tab.hash, $event)"
          :href="tab.hash"
          class="tabbed-example-tab-a"
          role="tab"
        ></a>
      </li>
    </ul>
    <div class="tabbed-example-panels">
      <slot />
    </div>
  </div>
</template>

<script>
  export default {
    props: {},
    data: () => ({
      tabs: [],
      activeTabHash: '',
    }),
    created() {
      this.tabs = this.$children;
    },
    mounted() {
      if (this.findTab(window.location.hash)) {
        this.selectTab(window.location.hash);
        return;
      }

      if (this.tabs.length) {
        // if we want to change the default tab,
        // this is where to do it
        this.selectTab(this.tabs[0].hash);
      }
    },
    methods: {
      findTab(hash) {
        return this.tabs.find(tab => tab.hash === hash);
      },
      selectTab(selectedTabHash, event) {
        // See if we should store the hash in the url fragment.
        if (event) {
          event.preventDefault();
        }
        const selectedTab = this.findTab(selectedTabHash);
        if (!selectedTab) {
          return;
        }
        if (selectedTab.isDisabled) {
          return;
        }
        this.tabs.forEach(tab => {
          tab.isActive = (tab.hash === selectedTab.hash);
        });

        this.$emit('changed', { tab: selectedTab });
        this.activeTabHash = selectedTab.hash;
      },
      setTabVisible(hash, visible) {
        const tab = this.findTab(hash);
        if (!tab) {
          return;
        }

        tab.isVisible = visible;
        if (tab.isActive) {
          // If tab is active, set a different one as active.
          tab.isActive = visible;
          this.tabs.every((tab, index, array) => {
            if (tab.isVisible) {
              tab.isActive = true;
              return false;
            }
            return true;
          });
        }
      },
    },
  };
</script>
