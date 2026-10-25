// 缓存名称和版本
const CACHE_NAME = 'daily-checkin-v25';
const CACHE_FILES = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  '/app-icon.svg',
  '/icon.png',
  '/icon-152.png',
  '/icon-167.png',
  '/icon-180.png'
];

// 安装阶段 - 缓存关键资源（用于离线）
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('缓存打开成功');
        return cache.addAll(CACHE_FILES);
      })
      .catch(error => {
        console.error('缓存失败:', error);
      })
  );
  self.skipWaiting();
});

// 激活阶段 - 清理所有旧缓存
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('删除旧缓存:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// 拦截网络请求 - 网络优先，离线后备用缓存
self.addEventListener('fetch', event => {
  // 只处理 GET 请求
  if (event.request.method !== 'GET') return;

  // 跳过跨域请求
  if (!event.request.url.startsWith(self.location.origin)) return;

  // 跳过非资源请求（导航请求）
  if (event.request.mode === 'navigate') return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // 只缓存成功的响应
        if (response && response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // 网络失败，从缓存取
        return caches.match(event.request).then(cachedResponse => {
          if (cachedResponse) {
            console.log('从缓存返回:', event.request.url);
            return cachedResponse;
          }
          // 都失败，返回空响应
          return new Response('离线模式', { status: 503, statusText: 'Offline' });
        });
      })
  );
});

// 消息处理
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
