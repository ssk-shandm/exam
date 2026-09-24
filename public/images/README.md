# 题库图库

此目录用于存放题目 JSON 中 `images` 字段引用的图片资源。

- Use paths beginning with `/images/`, for example `/images/my-bank/img-001.png`. Image files use opaque numeric names such as `img-001.png`; do not infer image meaning from the filename or depend on local absolute paths.
- After adding or changing images, redeploy the Web version or rebuild the Tauri installer.


The document converter names embedded images with opaque numeric filenames such as `img-001.png` and writes the matching `/images/<bank>/...` path into the question JSON. The filename has no semantic meaning; the program uses the marker and manifest to associate images. Use the package download and extract it into `public/`.
