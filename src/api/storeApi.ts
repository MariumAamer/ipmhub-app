/* eslint-disable prettier/prettier */
// src/api/storeApi.ts

const BASE_URL = 'https://hub.instituteprojectmanagement.com/wp-json';

async function apiFetch(path: string, token: string) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`${res.status}: ${path}`);
  return res.json();
}

/** LearnDash courses (sfwd-courses CPT)
 *  Fields used: title.rendered, yoast_head_json.og_image[0].url, course_price
 */
export async function fetchStoreCourses(token: string): Promise<any[]> {
  return apiFetch('/wp/v2/sfwd-courses?per_page=30&status=publish', token).catch(() => []);
}

/** "Recommended Courses" CPT — used as Certifications in the Store
 *  Fields used: title.rendered, yoast_head_json.og_image[0].url, content.rendered (desc)
 */
export async function fetchStoreCertifications(token: string): Promise<any[]> {
  return apiFetch('/wp/v2/courses?per_page=30&status=publish', token).catch(() => []);
}

/** WooCommerce products via WP REST (product CPT)
 *  Fields used: title.rendered, yoast_head_json.og_image[0].url, excerpt.rendered (desc)
 *  Note: price not available in WP REST — requires /wc/v3/products (needs WC key auth)
 */
export async function fetchStorePMSoftwares(token: string): Promise<any[]> {
  return apiFetch('/wp/v2/product?per_page=30&status=publish', token).catch(() => []);
}

export async function fetchAllStoreData(token: string) {
  const [courses, certifications, softwares] = await Promise.all([
    fetchStoreCourses(token),
    fetchStoreCertifications(token),
    fetchStorePMSoftwares(token),
  ]);
  return { courses, certifications, softwares };
}
