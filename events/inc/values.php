<?php
namespace Soli\Events\Values;

define("SOLI_ROOM_NAMES", array("Grote zaal", "Spiegelzaal", "Garderobe", "Studio 1", "Studio 2"));
define("SOLI_ROOM_SLUGS", array("grote-zaal", "spiegelzaal", "garderobe", "studio-1", "studio-2"));

function roomIndexesToSlugs($indexes): ?array {
  $arr = json_decode($indexes);
  if (empty($arr) || !is_array($arr)){
    return null;
  }

  return array_map(function ($index): string {
    $ROOM_SLUGS = SOLI_ROOM_SLUGS;
    if ($index < 0 || $index > sizeof($ROOM_SLUGS) - 1){
      return 'INVALID_ROOM_INDEX';
    }

    return $ROOM_SLUGS[$index];
  }, $arr);
}

function translateLocation($ROOMS): ?string {
  $arr = json_decode($ROOMS);
  if (empty($arr)){
    return "";
  }

  if(!is_array($arr)){
    return "";
  }

  $ROOM_NAMES = SOLI_ROOM_NAMES;
  if (sizeof($ROOM_NAMES) === sizeof($arr)){
    return "Hele Gebouw";
  }

  return implode(' + ', array_map(function ($index) use ($ROOM_NAMES): string {
    if ($index < 0 || $index > sizeof($ROOM_NAMES) - 1){
      return '';
    }

    return $ROOM_NAMES[$index];
  }, $arr));
}

function niceNameEventStatus($statusEnum){
  switch ($statusEnum) {
    case "PUBLIC":
      return __("public", 'your_text_domain');
    case "PRIVATE":
      return __("private", 'your_text_domain');
    case "PLANNED":
      return __("planned", 'your_text_domain');
    case "PENDING_APPROVAL":
    default:
      return __("pending approval", 'your_text_domain');
  }
}
