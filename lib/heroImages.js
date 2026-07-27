// Hardcoded stock photo pool (direct images.unsplash.com CDN URLs, not the
// deprecated source.unsplash.com redirect API) used as full-bleed backgrounds
// for the homepage "Top News" showcase cards. Each category maps to a small
// set of thematically appropriate photos; a post is assigned deterministically
// (hash of its slug) so it always gets the same photo across restarts.

const IMG_PARAMS = '?w=800&q=80&auto=format&fit=crop';

const CATEGORY_IMAGES = {
  'Budget Destinations': [
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e' + IMG_PARAMS, // beach
    'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2' + IMG_PARAMS, // mountains
    'https://images.unsplash.com/photo-1477587458883-47145ed94245' + IMG_PARAMS, // coastline
  ],
  'Itineraries': [
    'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1' + IMG_PARAMS, // mountain road
    'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1' + IMG_PARAMS,
    'https://images.unsplash.com/photo-1544644181-1484b3fdfc62' + IMG_PARAMS, // fort/heritage
  ],
  'Travel Tips': [
    'https://images.unsplash.com/photo-1474487548417-781cb71495f3' + IMG_PARAMS, // train
    'https://images.unsplash.com/photo-1473625247593-9701e1057396' + IMG_PARAMS, // airport/travel
    'https://images.unsplash.com/photo-1436491865332-7a61a109cc05' + IMG_PARAMS, // road trip
  ],
  'Packing Guides': [
    'https://images.unsplash.com/photo-1553531384-cc64ac80f931' + IMG_PARAMS, // backpack
    'https://images.unsplash.com/photo-1502680390469-be75c86b636f' + IMG_PARAMS, // trekking
    'https://images.unsplash.com/photo-1520787497380-eeb0f1c0b0d1' + IMG_PARAMS, // packing gear
  ],
  'Local Food & Culture': [
    'https://images.unsplash.com/photo-1585032226651-759b368d7246' + IMG_PARAMS, // street food
    'https://images.unsplash.com/photo-1601050690597-df0568f70950' + IMG_PARAMS, // indian food
    'https://images.unsplash.com/photo-1524492412937-b28074a5d7da' + IMG_PARAMS, // heritage/culture
  ],
};

const DEFAULT_IMAGES = [
  'https://images.unsplash.com/photo-1488646953014-85cb44e25828' + IMG_PARAMS,
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e' + IMG_PARAMS,
];

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function getHeroImage(post) {
  const pool = CATEGORY_IMAGES[post.category] || DEFAULT_IMAGES;
  const key = post.slug || post.title || String(post.id || '');
  const idx = hashString(key) % pool.length;
  return pool[idx];
}

module.exports = { getHeroImage, CATEGORY_IMAGES, DEFAULT_IMAGES };
