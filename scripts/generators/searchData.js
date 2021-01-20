/* global hexo */

'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var moment = _interopDefault(require('moment'));
var keywordExtractor = require('keyword-extractor');
var hexoUtil = require('hexo-util');

var defaults = {
  pages: {
    raw: false,
    content: false,
    title: true,
    slug: true,
    date: true,
    updated: true,
    comments: true,
    path: true,
    link: true,
    permalink: true,
    excerpt: true,
    text: true,
    keywords: true,
    author: true,
  },

  posts: {
    raw: false,
    content: false,
    title: true,
    slug: true,
    date: true,
    updated: true,
    comments: true,
    path: true,
    link: true,
    permalink: true,
    excerpt: true,
    text: true,
    categories: true,
    tags: true,
    keywords: true,
    author: true,
  },
};

function ignoreSettings (cfg) {
  const ignore = cfg.ignore ? cfg.ignore : {};

  ignore.paths = ignore.paths
    ? ignore.paths.map((path) => path.toLowerCase())
    : [];

  ignore.tags = ignore.tags
    ? ignore.tags.map((tag) => tag.replace('#', '').toLowerCase())
    : [];

  return ignore;
}

function isIgnored (content, settings) {
  if (content.hidden === false) {
    return false;
  }

  if (content.password || content.hidden) {
    return true;
  }

  const pathIgnored = settings.paths.find((path) => content.path.includes(path));

  if (pathIgnored) {
    return true;
  }

  const tags = content.tags ? content.tags.map(mapTags) : [];
  const tagIgnored = tags.filter((tag) => settings.tags.includes(tag)).length;

  if (tagIgnored) {
    return true;
  }

  return false;
}

function mapTags (tag) {
  return typeof tag === 'object' ? tag.name.toLowerCase() : tag;
}

function has (obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function minify (str) {
  return hexoUtil.stripHTML(str
    .replace(/<div\s?id="encrypted(([\s\S])*?)<\/div>/g, ' ')
    .replace(/<div\s?id="keyMd(([\s\S])*?)<\/div>/g, ' ')
  ).trim().replace(/\s+/g, ' ');
}

function getProps (ref) {
  return Object.getOwnPropertyNames(ref).filter((key) => ref[key]);
}

function catags ({ name, slug, permalink }) {
  return { name, slug, permalink };
}

function getKeywords (str, language) {
  const keywords = keywordExtractor.extract(str, {
    language,
    remove_digits: true,
    return_changed_case: true,
    remove_duplicates: true,
  });

  return keywords.join(' ');
}

function setContent (obj, item, ref, cfg) {
  switch (item) {
    case 'excerpt':
      obj.excerpt = minify(ref.excerpt);
      break;

    case 'description':
      obj.description = minify(ref.description);
      break;

    case 'text':
      obj.text = minify(ref.content);
      break;

    case 'keywords':
      if (cfg.keywords) {
        const excerpt = minify(ref.excerpt);
        obj.keywords = getKeywords(excerpt, cfg.keywords);
      }
      break;

    case 'categories':
      obj.categories = ref.categories.map(catags);
      break;

    case 'tags':
      obj.tags = ref.tags.map(catags);
      break;

    case 'date':
      obj.date = cfg.dateFormat
        ? moment(ref.date).format(cfg.dateFormat)
        : ref.date;
      break;

    case 'updated':
      obj.updated = cfg.dateFormat
        ? moment(ref.updated).format(cfg.dateFormat)
        : ref.updated;
      break;

    default:
      obj[item] = ref[item];
  }

  return obj;
}

function reduceContent (props, content, cfg) {
  return props.reduce((obj, item) => setContent(obj, item, content, cfg), {});
}

function reduceCategs (posts) {
  const source = posts
    .map((post) => ({
      categories: post.categories ? post.categories.map(JSON.stringify) : [],
      tags: post.tags ? post.tags.map(JSON.stringify) : [],
    }))
    .reduce(
      (res, item) => {
        res.categories.push(...item.categories);
        res.tags.push(...item.tags);
        return res;
      },
      { categories: [], tags: [] },
    );

  const categories = [...new Set(source.categories)].map(JSON.parse);
  const tags = [...new Set(source.tags)].map(JSON.parse);

  return { categories, tags };
}

hexo.extend.generator.register('json-content', function (site) {
  const { config } = this.theme;
  const defs = { meta: true };
  const opts = config.jsonContent || {};
  const json = { ...defs, ...opts };
  const pages = has(json, 'pages') ? json.pages : defaults.pages;
  const posts = has(json, 'posts') ? json.posts : defaults.posts;
  const ignore = ignoreSettings(json);
  const categs = {
    categories: [],
    tags: [],
  };

  let output = json.meta
    ? {
      meta: {
        title: config.title,
        subtitle: config.subtitle,
        description: config.description,
        author: config.author,
        url: config.url,
        root: config.root,
      },
    }
    : {};

  // console.log('config: ', config);
  if (pages) {
    const pagesProps = getProps(pages);
    const pagesValid = site.pages.filter((page) => !isIgnored(page, ignore));
    const pagesContent = pagesValid.map((page) =>
      reduceContent(pagesProps, page, json),
    );

    if (posts || json.meta) {
      output = Object.assign(output, { pages: pagesContent });

      const pagesCategs = reduceCategs(pagesContent);

      categs.categories.push(...pagesCategs.categories);
      categs.tags.push(...pagesCategs.tags);
    } else {
      output = pagesContent;
    }
  }

  if (posts) {
    const postsProps = getProps(posts);
    const postsSorted = site.posts.sort('-date');
    const postsValid = postsSorted.filter((post) => {
      const include = json.drafts || post.published;
      return include && !isIgnored(post, ignore);
    });
    const postsContent = postsValid.map((post) =>
      reduceContent(postsProps, post, json),
    );

    if (pages || json.meta) {
      output = Object.assign(output, { posts: postsContent });

      const postsCategs = reduceCategs(postsContent);

      categs.categories.push(...postsCategs.categories);
      categs.tags.push(...postsCategs.tags);
    } else {
      output = postsContent;
    }
  }

  if (pages || posts || json.meta) Object.assign(output, reduceCategs([categs]));

  return {
    path: json.file || 'content.json',
    data: JSON.stringify(output),
  };
});
