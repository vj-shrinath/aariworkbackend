# Sanity Blog Bridge for WordPress

This is a small testing plugin that reads published `post` documents from the Aari Sanity project and displays them inside an existing WordPress site.

## Install

1. Zip the `sanity-blog-bridge` folder.
2. In WordPress, open **Plugins → Add New → Upload Plugin**.
3. Activate it.
4. Open **Settings → Sanity Blog** and save the Sanity Project ID and dataset.

The default values match this repository: project `lx1zrwct`, dataset `production`.

## Use

Add this shortcode to a WordPress page:

```text
[sanity_posts]
```

Optional:

```text
[sanity_posts count="5" category="news"]
[sanity_post slug="your-post-slug"]
```

This test version reads published content only. It does not create or edit Sanity documents. Writing remains in Sanity Studio. A later version can add a protected WordPress admin editor, but a Sanity write token must stay server-side.
