<?php
echo '<script type="text/javascript">if (window.self === window.top) window.location = "https://accancamera.com";</script>';
$content = file_get_contents('https://docs.google.com/document/d/1QEeiu1FNnWnlnIYwr9NibFCNXJaB4aHWKJtKgJwcNaY/pub?embedded=true');
$content = str_replace('&lt;iframe', '<iframe', $content);
$content = str_replace('&gt;&lt;/iframe&gt;', '></iframe>', $content);
$content = str_replace('&quot;', '"', $content);
$content = str_replace('&rdquo;', '', $content);
$content = str_replace('https://www.google.com/url?q=', '', $content);
$content = str_replace('&lt;/a&gt;', '</a>', $content);
$content = str_replace('&lt;a', '<a', $content);
$content = str_replace('&gt;', '>', $content);
$content = str_replace('%23', '#', $content);
$content = str_replace('%3D', '=', $content);
$content = str_replace('%26', '&', $content);

// 06/2021: Thumbnail URLs are encoded and Google encodes them again. We need to undo this double encode
$content = str_replace('%253A', '%3A', $content);
$content = str_replace('%252F', '%2F', $content);
$content = str_replace('%252C', '%2C', $content);

$content = str_replace('<a', '<a target="_blank"', $content);
$content = str_replace('amp;', '', $content);
$content = str_replace('href="https://thumbnails', '><video muted controls autoplay loop src="https://thumbnails', $content);
$content = str_replace('[video]</a>', '</video>', $content);
$content = preg_replace('/&sa=\w*&ust=\d*"/', '"', $content);
$content = str_replace('<img', '<img class="lazy"', $content);
$content = str_replace('<video', '<video class="video-export lazy"', $content);
$content = str_replace('src', 'poster="assets/images/spinner.gif" src="assets/images/spinner.svg" data-src', $content);
$content = str_replace('</head>','<link rel="stylesheet" href="https://accancamera.com/assets/css/google-docs.css" /><script src="blog.js" type="text/javascript"></script></head>', $content);

// 06/2021: Thumbnail URLs now have extra crap added to the end of their video src URLS.
// e.g. &sa=D&source=editors&ust=1622915671901000&usg=AOvVaw02TryHHqiOi3eijKrfvAMg
$content = preg_replace('/(?=&sa=).*?(?=">)/', '', $content);

echo $content;
?>

