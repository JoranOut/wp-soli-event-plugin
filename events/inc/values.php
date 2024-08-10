<?php
namespace Soli\Events\Values;

function translateLocation($ROOMS): ?string {
  $arr = json_decode($ROOMS);
  if (empty($arr)){
    return "isempty";
  }

  if(!is_array($arr)){
    return "isnotArray";
  }

  $ROOM_NAMES = array("Grote zaal", "Spiegelzaal", "Garderobe", "Studio 1", "Studio 2");
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
