<?php
echo '<script type="text/javascript">if (window.self === window.top) window.location = "http://accancamera.com";</script>';
$content = file_get_contents('https://docs.google.com/document/d/1QEeiu1FNnWnlnIYwr9NibFCNXJaB4aHWKJtKgJwcNaY/pub?embedded=true');
$content = str_replace('</head>','<link rel="stylesheet" href="http://accancamera.com/assets/css/google-docs.css" /></head>', $content);
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
$content = str_replace('<a', '<a target="_blank"', $content);
echo $content;
?>
