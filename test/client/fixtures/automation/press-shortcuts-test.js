const hammerhead   = window.getTestCafeModule('hammerhead');
const browserUtils = hammerhead.utils.browser;

const testCafeCore     = window.getTestCafeModule('testCafeCore');
const textSelection    = testCafeCore.textSelection;
const domUtils         = testCafeCore.domUtils;
const parseKeySequence = testCafeCore.parseKeySequence;

const testCafeAutomation = window.getTestCafeModule('testCafeAutomation');
const PressAutomation    = testCafeAutomation.Press;

testCafeCore.preventRealEvents();

$(document).ready(function () {
    //consts
    const TEST_ELEMENT_CLASS = 'testElement';

    let $el = null;

    //utils
    const nativeSelect = function (el, from, to, inverse) {
        const start = from || 0;
        const end   = to;

        //NOTE: set to start position
        const startPosition = inverse ? end : start;

        if (el.setSelectionRange)
            el.setSelectionRange(startPosition, startPosition);
        else {
            el.selectionStart = startPosition;
            el.selectionEnd   = startPosition;
        }

        //NOTE: select
        if (el.setSelectionRange)
            el.setSelectionRange(start, end, inverse ? 'backward' : 'forward');
        else {
            el.selectionStart = start;
            el.selectionEnd   = end;
        }
    };

    const createTextInput = function (text, startSelection, endSelection, inverse) {
        const start = startSelection || text.length;
        const end   = endSelection || start;

        $el = $('<input type="text">').attr('id', 'input').addClass(TEST_ELEMENT_CLASS).appendTo('body').attr('value', text);
        $el[0].focus();
        nativeSelect($el[0], start, end, inverse);
        return $el[0];
    };

    const createTextarea = function (text, startSelection, endSelection, inverse, parent) {
        const start = startSelection || text.length;
        const end   = endSelection || start;

        $el = $('<textarea>')
            .attr('id', 'textarea').addClass(TEST_ELEMENT_CLASS).appendTo(parent || 'body')
            .css('height', 200).attr('value', text);

        $el[0].focus();
        nativeSelect($el[0], start, end, inverse);
        return $el[0];
    };

    const checkShortcut = function (element, value, selectionStart, selectionEnd, inverse) {
        selectionEnd = selectionEnd || selectionStart;

        const activeElement    = domUtils.findDocument(element).activeElement;
        const inverseSelection = textSelection.hasInverseSelection(activeElement);

        equal(activeElement, element, 'active element are correct');
        equal(activeElement.value, value, 'active element value are correct');
        equal(textSelection.getSelectionStart(activeElement), selectionStart, 'active element selection start are correct');
        equal(textSelection.getSelectionEnd(activeElement), selectionEnd, 'active element selection end are correct');

        if (!window.DIRECTION_ALWAYS_IS_FORWARD)
            ok(inverseSelection === (typeof inverse === 'undefined' ? false : inverse));
    };

    const runPressAutomation = function (keySequence, callback) {
        const keyCombinations = parseKeySequence(keySequence).combinations;
        const pressAutomation = new PressAutomation(keyCombinations, {});

        pressAutomation
            .run()
            .then(callback);
    };

    const getSelectedText = function (el) {
        return el.value.substring(textSelection.getSelectionStart(el), textSelection.getSelectionEnd(el));
    };

    QUnit.testDone(function () {
        $('.' + TEST_ELEMENT_CLASS).remove();
        $el = null;
    });

    //tests

    module('utils testing');

    test('getShortcutsByKeyCombination', function () {
        deepEqual(PressAutomation._getShortcuts('enter'), ['enter'], 'simple shortcut');
        deepEqual(PressAutomation._getShortcuts('ctrl+a'), ['ctrl+a'], 'combined shortcut');
        deepEqual(PressAutomation._getShortcuts('a+enter'), ['enter'], 'symbol and simple shortcut');
        deepEqual(PressAutomation._getShortcuts('enter+a'), ['enter'], 'simple shortcut and symbol');
        deepEqual(PressAutomation._getShortcuts('a+ctrl+a'), ['ctrl+a'], 'symbol and combined shortcut');
        deepEqual(PressAutomation._getShortcuts('ctrl+a+a'), ['ctrl+a'], 'combined shortcut and symbol');
        deepEqual(PressAutomation._getShortcuts('enter+ctrl+a'), ['enter', 'ctrl+a'], 'simple shortcut and combined shortcut');
        deepEqual(PressAutomation._getShortcuts('ctrl+a+enter'), ['ctrl+a', 'enter'], 'combined shortcut and simple shortcut');
        deepEqual(PressAutomation._getShortcuts('ctrl+a+a+enter'), ['ctrl+a', 'enter'], 'combined shortcut, symbol and simple shortcut');
    });

    module('events raising');

    asyncTest('events raising with shortcut', function () {
        const $input = $(createTextInput('text'));

        let keydownCount  = 0;
        let keyupCount    = 0;
        let keypressCount = 0;

        $input.keydown(
            function () {
                keydownCount++;
            }).keyup(
            function () {
                keyupCount++;
            }).keypress(
            function () {
                keypressCount++;
            });

        runPressAutomation('ctrl+a backspace', function () {
            equal(keydownCount, 3, 'keydown event raises twice');
            equal(keyupCount, 3, 'keyup event raises twice');
            equal(keypressCount, 0, 'keypress event is not raised');
            start();
        });
    });

    module('preventDefault');

    asyncTest('shortcut must not be raised when preventDefault called', function () {
        const text  = 'test';
        const input = createTextInput(text);

        $(input).keydown(function (e) {
            e.preventDefault();
        });

        runPressAutomation('ctrl+a', function () {
            notEqual(input.value, getSelectedText(input), 'text not selected');
            equal(input.value, text, 'text is not changed');
            start();
        });
    });

    module('enter');

    asyncTest('press enter in input', function () {
        const text           = 'text';
        const cursorPosition = 2;
        const input          = createTextInput(text, cursorPosition);

        runPressAutomation('enter', function () {
            checkShortcut(input, text, cursorPosition);
            start();
        });
    });

    asyncTest('press enter in textarea', function () {
        const text           = 'text';
        const cursorPosition = 2;
        const textarea       = createTextarea(text, cursorPosition);

        runPressAutomation('enter', function () {
            const newText = 'te\nxt';

            checkShortcut(textarea, newText, newText.indexOf('\n') + 1);
            start();
        });
    });

    module('home');

    asyncTest('press home in input', function () {
        const text  = 'text';
        const input = createTextInput(text, 2);

        runPressAutomation('home', function () {
            checkShortcut(input, text, 0);
            start();
        });
    });

    asyncTest('press home in textarea', function () {
        const text     = 'text\rarea';
        const textarea = createTextarea(text, 7);

        runPressAutomation('home', function () {
            const newText = text.replace('\r', '\n');

            checkShortcut(textarea, newText, newText.indexOf('\n') + 1);
            start();
        });
    });

    asyncTest('press home with selection', function () {
        const text  = 'text';
        const input = createTextInput(text, 2, text.length);


        runPressAutomation('home', function () {
            checkShortcut(input, text, 0);
            start();
        });
    });

    module('end');

    asyncTest('press end in input', function () {
        const text  = 'text';
        const input = createTextInput(text, 2);

        runPressAutomation('end', function () {
            checkShortcut(input, text, text.length);
            start();
        });
    });

    asyncTest('press end in textarea', function () {
        const text     = 'text\rarea';
        const textarea = createTextarea(text, 7);

        runPressAutomation('end', function () {
            const newText = text.replace('\r', '\n');

            checkShortcut(textarea, newText, newText.length);
            start();
        });
    });

    asyncTest('press end with selection', function () {
        const text  = 'text';
        const input = createTextInput(text, 2, text.length);

        runPressAutomation('end', function () {
            checkShortcut(input, text, text.length);
            start();
        });
    });

    module('up');

    asyncTest('press up in input', function () {
        const text           = 'text';
        const cursorPosition = 2;
        const input          = createTextInput(text, cursorPosition);

        runPressAutomation('up', function () {
            if (!browserUtils.isWebKit)
                checkShortcut(input, text, cursorPosition);
            else
                checkShortcut(input, text, 0);

            start();
        });
    });

    asyncTest('press up in textarea', function () {
        const text     = 'text\rarea';
        const textarea = createTextarea(text, 7);

        runPressAutomation('up', function () {
            const newText = text.replace('\r', '\n');

            checkShortcut(textarea, newText, 2);
            start();
        });
    });

    module('down');

    asyncTest('press down in input', function () {
        const text           = 'text';
        const cursorPosition = 2;
        const input          = createTextInput(text, cursorPosition);

        runPressAutomation('down', function () {
            if (!browserUtils.isWebKit)
                checkShortcut(input, text, cursorPosition);
            else
                checkShortcut(input, text, text.length);

            start();
        });
    });

    asyncTest('press down in textarea', function () {
        const text           = 'text\rarea';
        const cursorPosition = 2;
        const textarea       = createTextarea(text, cursorPosition);

        runPressAutomation('down', function () {
            const newText = text.replace('\r', '\n');

            checkShortcut(textarea, newText, newText.indexOf('\n') + cursorPosition + 1);
            start();
        });
    });

    module('left');

    asyncTest('press left in input', function () {
        const text           = 'text';
        const cursorPosition = 2;
        const input          = createTextInput(text, cursorPosition);

        runPressAutomation('left', function () {
            checkShortcut(input, text, cursorPosition - 1);
            start();
        });
    });

    asyncTest('press left in textarea', function () {
        const text              = 'text\rarea';
        const textarea          = createTextarea(text, 7);
        const oldSelectionStart = textSelection.getSelectionStart(textarea);

        runPressAutomation('left', function () {
            const newText = text.replace('\r', '\n');

            checkShortcut(textarea, newText, oldSelectionStart - 1);
            start();
        });
    });

    module('right');

    asyncTest('press right in input', function () {
        const text           = 'text';
        const cursorPosition = 2;
        const input          = createTextInput(text, cursorPosition);

        runPressAutomation('right', function () {
            checkShortcut(input, text, cursorPosition + 1);
            start();
        });
    });

    asyncTest('press right in textarea', function () {
        const text              = 'text\rarea';
        const textarea          = createTextarea(text, 7);
        const oldSelectionStart = textSelection.getSelectionStart(textarea);

        runPressAutomation('right', function () {
            const newText = text.replace('\r', '\n');

            checkShortcut(textarea, newText, oldSelectionStart + 1);
            start();
        });
    });

    module('backspace');

    asyncTest('press backspace in input', function () {
        const text           = 'text';
        const cursorPosition = 2;
        const input          = createTextInput(text, cursorPosition);

        runPressAutomation('backspace', function () {
            const newText = text.substring(0, cursorPosition - 1) + text.substring(cursorPosition);

            checkShortcut(input, newText, cursorPosition - 1);
            start();
        });
    });

    asyncTest('press backspace in textarea', function () {
        const text           = 'text\rarea';
        const cursorPosition = 5;
        const textarea       = createTextarea(text, cursorPosition);

        runPressAutomation('backspace', function () {
            const newText = text.replace('\r', '');

            checkShortcut(textarea, newText, cursorPosition - 1);
            start();
        });
    });

    module('delete');

    asyncTest('press delete in input', function () {
        const text           = 'text';
        const cursorPosition = 2;
        const input          = createTextInput(text, cursorPosition);

        runPressAutomation('delete', function () {
            const newText = text.substring(0, cursorPosition) + text.substring(cursorPosition + 1);

            checkShortcut(input, newText, cursorPosition);
            start();
        });
    });

    asyncTest('press delete in textarea', function () {
        const text           = 'text\rarea';
        const cursorPosition = 4;
        const textarea       = createTextarea(text, cursorPosition);

        runPressAutomation('delete', function () {
            const newText = text.replace('\r', '');

            checkShortcut(textarea, newText, cursorPosition);
            start();
        });
    });

    module('ctrl+a');

    asyncTest('press ctrl+a in input', function () {
        const text  = 'test';
        const input = createTextInput(text, 2);

        runPressAutomation('ctrl+a', function () {
            checkShortcut(input, text, 0, text.length);
            start();
        });
    });

    asyncTest('press ctrl+a in textarea', function () {
        const text     = 'test\rarea';
        const textarea = createTextarea(text, 2);

        runPressAutomation('ctrl+a', function () {
            const newText = text.replace('\r', '\n');

            checkShortcut(textarea, newText, 0, newText.length);
            start();
        });
    });

    asyncTest('B233976: Wrong recording key combination Ctrl+A and DELETE', function () {
        const text     = 'test\rarea';
        const textarea = createTextarea(text, 2);

        runPressAutomation('ctrl+a', function () {
            const newText = text.replace('\r', '\n');

            checkShortcut(textarea, newText, 0, newText.length);

            runPressAutomation('delete', function () {
                checkShortcut(textarea, '', 0, 0);
                start();
            });
        });
    });

    asyncTest('press ctrl+a and backspace press in textarea', function () {
        const text     = 'test\rarea';
        const textarea = createTextarea(text, 2);

        runPressAutomation('ctrl+a', function () {
            const newText = text.replace('\r', '\n');

            checkShortcut(textarea, newText, 0, newText.length);

            runPressAutomation('backspace', function () {
                checkShortcut(textarea, '', 0, 0);
                start();
            });
        });
    });

    module('test shortcut inside keys combination');

    asyncTest('press left+a in input', function () {
        const text  = '1';
        const input = createTextInput(text, text.length);

        runPressAutomation('left+a', function () {
            checkShortcut(input, 'a1', 1);
            start();
        });
    });

    asyncTest('press a+left in input', function () {
        const text  = '1';
        const input = createTextInput(text, text.length);

        runPressAutomation('a+left', function () {
            checkShortcut(input, '1a', 1);
            start();
        });
    });

    module('test keys combination of two shortcuts');

    asyncTest('press left+home in textarea', function () {
        const text     = 'test\rarea';
        const textarea = createTextarea(text, 7);

        runPressAutomation('left+home', function () {
            const newText = text.replace('\r', '\n');

            checkShortcut(textarea, newText, newText.indexOf('\n') + 1);
            start();
        });
    });

    asyncTest('press home+left in textarea', function () {
        const text     = 'test\rarea';
        const textarea = createTextarea(text, 7);

        runPressAutomation('home+left', function () {
            const newText = text.replace('\r', '\n');

            checkShortcut(textarea, newText, 4);
            start();
        });
    });

    module('shift+left');

    asyncTest('press shift+left in textarea without selection', function () {
        const text            = 'text\rarea';
        const newText         = text.replace('\r', '\n');
        const cursorPosition  = 6;
        const textarea        = createTextarea(text, cursorPosition);
        const keys            = 'shift+left';
        const pressAutomation = new PressAutomation(parseKeySequence(keys).combinations, {});

        pressAutomation
            .run()
            .then(function () {
                return pressAutomation.run();
            })
            .then(function () {
                return pressAutomation.run();
            })
            .then(function () {
                return pressAutomation.run();
            })
            .then(function () {
                checkShortcut(textarea, newText, cursorPosition - 4, cursorPosition, true);
                start();
            });
    });

    asyncTest('press shift+left in textarea with forward selection', function () {
        const text            = 'text\rare\rtest';
        const newText         = text.replace(/\r/g, '\n');
        const startSelection  = 7;
        const endSelection    = 10;
        const textarea        = createTextarea(text, startSelection, endSelection);
        const keys            = 'shift+left';
        const pressAutomation = new PressAutomation(parseKeySequence(keys).combinations, {});

        pressAutomation
            .run()
            .then(function () {
                return pressAutomation.run();
            })
            .then(function () {
                return pressAutomation.run();
            })
            .then(function () {
                return pressAutomation.run();
            })
            .then(function () {
                checkShortcut(textarea, newText, 6, 7, true);
                start();
            });
    });

    asyncTest('press shift+left in textarea with backward selection', function () {
        const text            = 'text\rare\rtest';
        const newText         = text.replace(/\r/g, '\n');
        const startSelection  = 7;
        const endSelection    = 10;
        const textarea        = createTextarea(text, startSelection, endSelection, true);
        const keys            = 'shift+left';
        const pressAutomation = new PressAutomation(parseKeySequence(keys).combinations, {});

        pressAutomation
            .run()
            .then(function () {
                return pressAutomation.run();
            })
            .then(function () {
                return pressAutomation.run();
            })
            .then(function () {
                return pressAutomation.run();
            })
            .then(function () {
                checkShortcut(textarea, newText, startSelection - 4, endSelection, true);
                start();
            });
    });

    module('shift+right');

    asyncTest('press shift+right in textarea without selection', function () {
        const text            = 'text\rarea';
        const newText         = text.replace('\r', '\n');
        const cursorPosition  = 3;
        const textarea        = createTextarea(text, cursorPosition);
        const keys            = 'shift+right';
        const pressAutomation = new PressAutomation(parseKeySequence(keys).combinations, {});

        pressAutomation
            .run()
            .then(function () {
                return pressAutomation.run();
            })
            .then(function () {
                return pressAutomation.run();
            })
            .then(function () {
                return pressAutomation.run();
            })
            .then(function () {
                checkShortcut(textarea, newText, cursorPosition, cursorPosition + 4);
                start();
            });
    });

    asyncTest('press shift+right in textarea with forward selection', function () {
        const text            = 'text\rarea\rtest';
        const newText         = text.replace(/\r/g, '\n');
        const startSelection  = 3;
        const endSelection    = 7;
        const textarea        = createTextarea(text, startSelection, endSelection);
        const keys            = 'shift+right';
        const pressAutomation = new PressAutomation(parseKeySequence(keys).combinations, {});

        pressAutomation
            .run()
            .then(function () {
                return pressAutomation.run();
            })
            .then(function () {
                return pressAutomation.run();
            })
            .then(function () {
                return pressAutomation.run();
            })
            .then(function () {
                checkShortcut(textarea, newText, startSelection, 11);
                start();
            });
    });

    asyncTest('press shift+right in textarea with backward selection', function () {
        const text            = 'text\rare\rtest';
        const newText         = text.replace(/\r/g, '\n');
        const startSelection  = 2;
        const endSelection    = 12;
        const textarea        = createTextarea(text, startSelection, endSelection, true);
        const keys            = 'shift+right';
        const pressAutomation = new PressAutomation(parseKeySequence(keys).combinations, {});

        pressAutomation
            .run()
            .then(function () {
                return pressAutomation.run();
            })
            .then(function () {
                return pressAutomation.run();
            })
            .then(function () {
                return pressAutomation.run();
            })
            .then(function () {
                checkShortcut(textarea, newText, startSelection + 4, endSelection, true);
                start();
            });
    });

    module('shift+up');

    asyncTest('press shift+up in input', function () {
        const text           = 'text';
        const cursorPosition = 2;
        const input          = createTextInput(text, cursorPosition);

        runPressAutomation('shift+up', function () {
            if (!browserUtils.isWebKit)
                checkShortcut(input, text, cursorPosition);
            else
                checkShortcut(input, text, 0, cursorPosition, true);

            start();
        });
    });

    asyncTest('press shift+up in textarea without selection', function () {
        const text           = 'text\rarea';
        const newText        = text.replace('\r', '\n');
        const cursorPosition = 7;
        const textarea       = createTextarea(text, cursorPosition);

        runPressAutomation('shift+up', function () {
            checkShortcut(textarea, newText, cursorPosition - 5, cursorPosition, true);
            start();
        });
    });

    asyncTest('press shift+up in textarea with forward selection', function () {
        const text           = 'aaaa\rbbbb\rcccc';
        const newText        = text.replace(/\r/g, '\n');
        const startSelection = 8;
        const endSelection   = 12;
        const textarea       = createTextarea(text, startSelection, endSelection);

        runPressAutomation('shift+up', function () {
            checkShortcut(textarea, newText, startSelection - 1, startSelection, true);
            start();
        });
    });

    asyncTest('press shift+right in textarea with backward selection', function () {
        const text           = 'aaaa\rbbbb\rcccc';
        const newText        = text.replace(/\r/g, '\n');
        const startSelection = 8;
        const endSelection   = 12;
        const textarea       = createTextarea(text, startSelection, endSelection, true);

        runPressAutomation('shift+up', function () {
            checkShortcut(textarea, newText, startSelection - 5, endSelection, true);
            start();
        });
    });

    module('shift+down');

    asyncTest('press shift+down in input', function () {
        const text           = 'text';
        const cursorPosition = 2;
        const input          = createTextInput(text, cursorPosition);

        runPressAutomation('shift+down', function () {
            if (!browserUtils.isWebKit)
                checkShortcut(input, text, cursorPosition);
            else
                checkShortcut(input, text, cursorPosition, text.length);

            start();
        });
    });

    asyncTest('press shift+down in textarea without selection', function () {
        const text           = 'text\rarea';
        const newText        = text.replace('\r', '\n');
        const cursorPosition = 2;
        const textarea       = createTextarea(text, cursorPosition);

        runPressAutomation('shift+down', function () {
            checkShortcut(textarea, newText, cursorPosition, cursorPosition + 5);
            start();
        });
    });

    asyncTest('press shift+down in textarea with forward selection', function () {
        const text           = 'aaaa\rbbbb\rcccc';
        const newText        = text.replace(/\r/g, '\n');
        const startSelection = 3;
        const endSelection   = 8;
        const textarea       = createTextarea(text, startSelection, endSelection);

        runPressAutomation('shift+down', function () {
            checkShortcut(textarea, newText, startSelection, endSelection + 5);
            start();
        });
    });

    asyncTest('press shift+down in textarea with backward selection', function () {
        const text           = 'aaaa\rbbbb\rcccc';
        const newText        = text.replace(/\r/g, '\n');
        const startSelection = 8;
        const endSelection   = 12;
        const textarea       = createTextarea(text, startSelection, endSelection, true);

        runPressAutomation('shift+down', function () {
            checkShortcut(textarea, newText, endSelection, startSelection + 5);
            start();
        });
    });

    module('shift+home');

    asyncTest('press shift+home in input', function () {
        const text  = 'text';
        const input = createTextInput(text, 2);

        runPressAutomation('shift+home', function () {
            checkShortcut(input, text, 0, 2, true);
            start();
        });
    });

    asyncTest('press shift+home in textarea without selection', function () {
        const text           = 'text\rarea';
        const newText        = text.replace('\r', '\n');
        const cursorPosition = 7;
        const textarea       = createTextarea(text, cursorPosition);

        runPressAutomation('shift+home', function () {
            checkShortcut(textarea, newText, newText.indexOf('\n') + 1, cursorPosition, true);
            start();
        });
    });

    asyncTest('press shift+home in textarea with forward selection', function () {
        const text          = 'text\rarea';
        const newText       = text.replace('\r', '\n');
        const startPosition = 7;
        const endPosition   = 8;
        const textarea      = createTextarea(text, startPosition, endPosition);

        runPressAutomation('shift+home', function () {
            checkShortcut(textarea, newText, newText.indexOf('\n') + 1, startPosition, true);
            start();
        });
    });

    asyncTest('press shift+home in textarea with backward selection', function () {
        const text          = 'text\rarea';
        const newText       = text.replace('\r', '\n');
        const startPosition = 7;
        const endPosition   = 8;
        const textarea      = createTextarea(text, startPosition, endPosition, true);

        runPressAutomation('shift+home', function () {
            checkShortcut(textarea, newText, newText.indexOf('\n') + 1, endPosition, true);
            start();
        });
    });

    module('shift+end');

    asyncTest('press shift+end in input', function () {
        const text  = 'text';
        const input = createTextInput(text, 2);

        runPressAutomation('shift+end', function () {
            checkShortcut(input, text, 2, 4);
            start();
        });
    });

    asyncTest('press shift+end in textarea without selection', function () {
        const text           = 'text\rarea';
        const newText        = text.replace('\r', '\n');
        const cursorPosition = 7;
        const textarea       = createTextarea(text, cursorPosition);

        runPressAutomation('shift+end', function () {
            checkShortcut(textarea, newText, cursorPosition, text.length);
            start();
        });
    });

    asyncTest('press shift+end in textarea with forward selection', function () {
        const text          = 'text\rarea';
        const newText       = text.replace('\r', '\n');
        const startPosition = 7;
        const endPosition   = 8;
        const textarea      = createTextarea(text, startPosition, endPosition);

        runPressAutomation('shift+end', function () {
            checkShortcut(textarea, newText, startPosition, text.length);
            start();
        });
    });

    asyncTest('press shift+end in textarea with backward selection', function () {
        const text          = 'text\rarea';
        const newText       = text.replace('\r', '\n');
        const startPosition = 7;
        const endPosition   = 8;
        const textarea      = createTextarea(text, startPosition, endPosition, true);

        runPressAutomation('shift+end', function () {
            checkShortcut(textarea, newText, endPosition, text.length);
            start();
        });
    });

    module('Resression tests. B238614 ');

    asyncTest('Incorrectly selection reproduce (left)', function () {
        const text          = 'input';
        const startPosition = 2;
        const endPosition   = 4;
        const input         = createTextInput(text, startPosition, endPosition);

        runPressAutomation('left', function () {
            checkShortcut(input, text, startPosition, startPosition);
            start();
        });
    });

    asyncTest('Incorrectly selection reproduce (right)', function () {
        const text          = 'input';
        const startPosition = 2;
        const endPosition   = 4;
        const input         = createTextInput(text, startPosition, endPosition);

        runPressAutomation('right', function () {
            checkShortcut(input, text, endPosition, endPosition);
            start();
        });
    });

    module('Resression tests.');

    //B238809 - Wrong playback test with shift+home/shift+end shortcuts in multiline textarea.
    asyncTest('B238809. Press shift+home in textarea with forward multiline selection', function () {
        const text          = 'text\rarea';
        const newText       = text.replace('\r', '\n');
        const startPosition = 2;
        const endPosition   = 7;
        const textarea      = createTextarea(text, startPosition, endPosition);

        runPressAutomation('shirt+home', function () {
            checkShortcut(textarea, newText, startPosition, newText.indexOf('\n') + 1, false);
            start();
        });
    });

    asyncTest('B238809. Press shift+home in textarea with backward multiline selection', function () {
        const text          = 'text\rarea';
        const newText       = text.replace('\r', '\n');
        const startPosition = 2;
        const endPosition   = 7;
        const textarea      = createTextarea(text, startPosition, endPosition, true);

        runPressAutomation('shift+home', function () {
            checkShortcut(textarea, newText, 0, endPosition, true);
            start();
        });
    });

    asyncTest('B238809. Press shift+end in textarea with forward multiline selection', function () {
        const text          = 'text\rarea';
        const newText       = text.replace('\r', '\n');
        const startPosition = 2;
        const endPosition   = 8;
        const textarea      = createTextarea(text, startPosition, endPosition);

        runPressAutomation('shift+end', function () {
            checkShortcut(textarea, newText, startPosition, newText.length, false);
            start();
        });
    });

    asyncTest('B238809. Press shift+end in textarea with backward multiline selection', function () {
        const text          = 'text\rarea';
        const newText       = text.replace('\r', '\n');
        const startPosition = 2;
        const endPosition   = 8;
        const textarea      = createTextarea(text, startPosition, endPosition, true);

        runPressAutomation('shift+end', function () {
            checkShortcut(textarea, newText, newText.indexOf('\n'), endPosition, true);
            start();
        });
    });

    asyncTest('T325474 - Press backspace works incorrectly with \'input\' type=number element in Google Chrome 47 (backspace)', function () {
        const value = '-123.5';
        const input = $('<input type="number" step="0.1"/>')
            .val(value)
            .addClass(TEST_ELEMENT_CLASS)
            .appendTo('body')[0];

        input.focus();
        nativeSelect(input, value.length, value.length);

        runPressAutomation('backspace', function () {
            checkShortcut(input, '-123', 4);
            start();
        });
    });

    asyncTest('T325474: Press backspace works incorrectly with \'input\' type=number element in Google Chrome 47 (delete)', function () {
        const value = '-123.5';
        const input = $('<input type="number" step="0.1"/>')
            .val(value)
            .addClass(TEST_ELEMENT_CLASS)
            .appendTo('body')[0];

        input.focus();
        nativeSelect(input, 1, 4);

        runPressAutomation('delete', function () {
            checkShortcut(input, '.5', 1);
            start();
        });
    });

    asyncTest("gh-1499 - Shortcuts work wrong if input's value ends with '.' or starts with '-.'", function () {
        const input = createTextInput('a-.text.');

        input.focus();
        nativeSelect(input, 0, 0);

        runPressAutomation('delete', function () {
            checkShortcut(input, '-.text.', 0, 0);
            start();
        });
    });
});
