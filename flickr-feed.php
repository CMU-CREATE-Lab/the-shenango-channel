<?php
echo '<script type="text/javascript">if (window.self === window.top) window.location = "http://shenangochannel.org";</script>';
$content = file_get_contents('http://flickrslidr.com/slideshow/view.php?g=fdJeek');
$content = str_replace('</title>','</title><base href="http://flickrslidr.com/slideshow/" />', $content);
$content = str_replace('</head>','<link rel="stylesheet" href="http://shenangochannel.org/assets/css/flickr-feed.css" /></head>', $content);
$content = str_replace('&lt;iframe', '<iframe', $content);
$content = str_replace('&gt;&lt;/iframe&gt;', '></iframe>', $content);
$content = str_replace('&quot;', '"', $content);
$content = str_replace('&rdquo;', '', $content);
$content = str_replace('&lt;/a&gt;', '</a>', $content);
$content = str_replace('&lt;a', '<a', $content);
$content = str_replace('&gt;', '>', $content);
echo $content;
?>
