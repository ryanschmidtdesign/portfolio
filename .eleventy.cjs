module.exports = function(eleventyConfig) {
  eleventyConfig.setTemplateFormats("html,njk");
  
  // Pass through files that shouldn't be processed
  eleventyConfig.addPassthroughCopy("assets");
  eleventyConfig.addPassthroughCopy("css");
  eleventyConfig.addPassthroughCopy("scripts");
  eleventyConfig.addPassthroughCopy("api");
  eleventyConfig.addPassthroughCopy("sw.js");
  eleventyConfig.addPassthroughCopy("favicon.ico");
  eleventyConfig.addPassthroughCopy("favicon.svg");
  eleventyConfig.addPassthroughCopy("apple-touch-icon.png");

  return {
    dir: {
      input: ".",
      includes: "_includes",
      output: "_site",
      data: "_data"
    }
  };
};
