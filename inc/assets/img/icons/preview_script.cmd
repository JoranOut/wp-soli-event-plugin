@echo off
setlocal enabledelayedexpansion

rem Define the output file
set "output=svg_list.js"

rem Start writing the JS array
echo const svgFiles = [ > %output%

rem Loop through SVG files and add them to the list
for %%F in (*.svg) do (
    echo     "%%F", >> %output%
)

rem Finish the JS array
echo ]; >> %output%

echo SVG list generated in %output%
