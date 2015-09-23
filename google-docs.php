<?php
echo '<script type="text/javascript">if (window.self === window.top) window.location = "http://shenangochannel.org";</script>';
$content = file_get_contents('https://docs.google.com/document/d/1bTZj92HDuufd8QsGjJNR7qSOwZxTdbAodDl29dQPTAQ/pub?embedded=true');
//$content = str_replace('</title>','</title><base href="https://docs.google.com/" />', $content);
//$content = str_replace('</head>','<link rel="stylesheet" href="http://explorables.cmucreatelab.org/the-shenango-channel2/assets/css/google-docs.css" /></head>', $content);
$content = str_replace('&lt;iframe', '<iframe', $content);
$content = str_replace('&gt;&lt;/iframe&gt;', '></iframe>', $content);
$content = str_replace('&quot;', '"', $content);
$content = str_replace('https://www.google.com/url?q=', '', $content);
$content = str_replace('&lt;/a&gt;', '</a>', $content);
$content = str_replace('&lt;a', '<a', $content);
$content = str_replace('&gt;', '>', $content);
echo $content;
?>
