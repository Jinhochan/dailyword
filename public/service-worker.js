// 缓存名称和版本
const CACHE_NAME = 'daily-checkin-v1';
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

// 安装阶段 - 缓存关键资源
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
  // 跳过等待，立即激活新的service worker
  self.skipWaiting();
});

// 激活阶段 - 清理旧缓存
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
  // 立即获取控制权
  return self.clients.claim();
});

// 拦截网络请求 - 提供离线支持
self.addEventListener('fetch', event => {
  // 对于API请求，我们不缓存，因为它们包含动态数据
  if (event.request.url.includes('/.netlify/functions/')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // 返回离线状态响应
          return new Response(
            JSON.stringify({ offline: true, message: '离线模式，无法连接到服务器' }),
            { headers: { 'Content-Type': 'application/json' } }
          );
        })
    );
    return;
  }

  // 对于静态资源，使用缓存优先策略
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 如果缓存命中，直接返回缓存的资源
        if (response) {
          return response;
        }

        // 否则从网络获取
        return fetch(event.request).then(
          networkResponse => {
            // 如果响应有效，将其克隆并添加到缓存
            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
              const responseToCache = networkResponse.clone();
              
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
            }
            
            return networkResponse;
          }
        ).catch(() => {
          // 如果网络请求失败，返回一个默认的离线页面或错误信息
          return new Response(
            '<h1>离线模式</h1><p>请检查您的网络连接</p>',
            { headers: { 'Content-Type': 'text/html' } }
          );
        });
      })
  );
});

// 监听消息 - 允许页面与service worker通信
self.addEventListener('message', event => {
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});