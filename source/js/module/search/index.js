import { postSearch } from './parser';

const headerDiv = document.getElementsByClassName('header-inner')[0],
  searchInput = document.querySelector('.header-inner .search input'),
  searchBox = document.getElementsByClassName('search-box')[0],
  searchContainer = searchBox.getElementsByClassName('search-container')[0],
  searchCounter = searchContainer.getElementsByClassName('search-count')[0],
  searchResult = searchContainer.getElementsByClassName('search-result')[0],
  searchCloseBtn = document.querySelector('.header-inner .search .search-close-icon'),
  mobileSearchCloseBtn = document.querySelector('.header-inner .mobile-search .search-close-icon'),
  searchShadow = document.getElementsByClassName('search-shadow')[0],
  mobileSearchInput = document.querySelector('.mobile-search input');

function escapeRegExp (s) {
  return s.replace(/[(){}[\]|.*+?^$\\]/g, '\\$&');
}
function renderSearchData (keyword, counterEl, resultEl) {
  let rkey = new RegExp(escapeRegExp(keyword), 'gi');
  const data = {
    posts: window.searchData.posts.map(post => postSearch(post, rkey)).filter(data => data !== null),
    pages: window.searchData.pages.map(post => postSearch(post, rkey)).filter(data => data !== null),
  };
  const html = [...data.pages, ...data.posts]
    .sort((a, b) => b.weight - a.weight).map(o => o.output).join('');
  let counter = data.posts.length + data.pages.length;
  counterEl.innerHTML = `一共搜索到 ${counter} 个结果`;
  resultEl.innerHTML = html;
}

function initializeSearchData () {
  if (window.searchData === undefined) {
    (new Promise(function (resolve, reject) {
      fetch('/search.json')
        .then(res => res.json())
        .then(function (data) {
          console.log('Search data initialize succeed!');
          window.searchData = data;
          document.getElementsByClassName('search-result')[0].innerHTML = '';
          resolve(data);
        })
        .catch(function (reason) {
          console.error('Search data initialize failed!');
          reject(reason);
        });
    })).catch(function (err) {
      console.error('Search data initialize failed!');
      console.log(err);
    });
  }
}

function bindEvent () {
  searchInput.addEventListener('focus', () => searchOpen('desktop'), false);
  searchInput.addEventListener('keyup', searchSubmit, false);

  mobileSearchInput.addEventListener('focus', () => searchOpen('mobile'), false);
  mobileSearchInput.addEventListener('keyup', mobileSearchSubmit, false);

  searchCloseBtn.addEventListener('click', () => searchClose('desktop', true), false);
  mobileSearchCloseBtn.addEventListener('click', () => searchClose('mobile', true), false);

  searchBox.addEventListener('click', () => searchClose(false), false);
  searchContainer.addEventListener('click', (e) => {
    e.stopPropagation();
  });
}
function searchOpen (type) {
  if(type === 'mobile') {
    headerDiv.classList.add('mobile-search-active');
    searchBox.classList.add('active', 'mobile');
  } else {
    headerDiv.classList.add('header-input-shadow');
    searchBox.classList.add('active');
  }
  searchShadow.classList.add('active');
  if (!window.searchData) initializeSearchData();
}
function searchClose (type, clearAll) {
  if(type === 'mobile') {
    headerDiv.classList.remove('mobile-search-active');
    searchBox.classList.remove('active', 'mobile');
    if (clearAll) {
      mobileSearchInput.value = '';
    }
  } else {
    headerDiv.classList.remove('header-input-shadow');
    searchBox.classList.remove('active');
    if (clearAll) {
      searchInput.value = '';
    }
  }
  searchShadow.classList.remove('active');
  if (clearAll) {
    searchResult.innerHTML = '';
    searchCounter.innerHTML = '';
  }
}
export function searchSubmit (e) {
  if (e && e.keyCode === 27) {
    searchClose('desktop', false);
    e.target.blur();
  }
  const str = searchInput.value;
  if (window.searchData) {
    if (str) {
      renderSearchData(str, searchCounter, searchResult);
    }
  } else {
    console.error('searchData not defined!');
  }
}

export function mobileSearchSubmit (e) {
  if (e && e.keyCode === 27) {
    searchClose('mobile', false);
    e.target.blur();
  }
  const str = mobileSearchInput.value;
  if (window.searchData) {
    if (str) {
      renderSearchData(str, searchCounter, searchResult);
    }
  } else {
    console.error('searchData not defined!');
  }
}

export function searchInit() {
  bindEvent ();
}

export function mobileSearchControl (method) {
  if(method === 'open') {
    headerDiv.classList.add('mobile-search-active');
    mobileSearchInput.focus();
  } else {
    searchClose('mobile', true);
  }
}