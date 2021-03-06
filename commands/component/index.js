'use strict';

const erector = require('erector-set');
const path = require('path');
const utilities = require('../utilities');

module.exports = (rootDir, selector) => {
    const templates = getTemplates(rootDir);

    if (utilities.checkIsDashFormat(selector)) {
        createWithKnownSelector(selector, templates);
    } else {
        createWithMissingSelector(templates);
    }
};

const createWithKnownSelector = (selector, templates) => {
    const knownAnswers = [
        { answer: selector, name: 'selector' },
        { answer: utilities.dashToCap(selector) + 'Component', name: 'componentName' }
    ];
    const questions = getComponentOptionQuestions(knownAnswers);

    erector.inquire(questions).then((answers) => {
        const allAnswers = knownAnswers.concat(answers);

        erector.construct(allAnswers, templates, true);
        notifyUser(allAnswers);
    });
};

const createWithMissingSelector = (templates) => {
    const questions = getAllQuestions();

    erector.build(questions, templates).then(notifyUser);
};

const getAllQuestions = () => {
    const baseQuestions = [
        { name: 'selector', question: 'What is the component selector (in dash-case)?', transform: (value) => utilities.checkIsDashFormat(value) ? value : null },
        { name: 'componentName', transform: (value) => utilities.dashToCap(value) + 'Component', useAnswer: 'selector' }
    ];

    return baseQuestions.concat(getComponentOptionQuestions());
};

const getComponentOptionQuestions = (knownAnswers) => [
    { allowBlank: true, name: 'styles', question: 'Use inline styles (y/N)?', transform: utilities.createYesNoValue('n', knownAnswers, setInlineStyles) },
    { allowBlank: true, name: 'template', question: 'Use inline template (y/N)?', transform: utilities.createYesNoValue('n', knownAnswers, setInlineTemplate) },
    { name: 'styleAttribute', useAnswer: 'styles', transform: pickStyleAttribute },
    { name: 'templateAttribute', useAnswer: 'template', transform: pickTemplateAttribute }
].concat(getLifecycleHookQuestions());

const setInlineStyles = (value, answers) => {
    const selector = answers.find((answer) => answer.name === 'selector');

    return value ? '``' : `'./${selector.answer}.component.scss'`;
};

const setInlineTemplate = (value, answers) => {
    const selector = answers.find((answer) => answer.name === 'selector');

    return value ? '``' : `'./${selector.answer}.component.html'`;
};

const pickStyleAttribute = (value) => {
    let attribute = 'Urls';

    if (value === '``') {
        attribute = 's';
    }

    return 'style' + attribute;
};

const pickTemplateAttribute = (value) => {
    let attribute = 'Url';

    if (value === '``') {
        attribute = '';
    }

    return 'template' + attribute;
};

const getLifecycleHookQuestions = () => [
    { allowBlank: true, name: 'hooks', question: 'Lifecycle hooks (comma-separated):', transform: setLifecycleHooks },
    { name: 'implements', useAnswer: 'hooks', transform: setLifecycleImplements },
    { name: 'lifecycleNg', useAnswer: 'hooks', transform: setLifecycleMethods }
];

const setLifecycleHooks = (value) => {
    const hooks = value.split(',')
        .map(getHookName)
        .filter((hook) => !!hook);
    const comma = ', ';

    if (hooks.length > 0) {
        value = comma + hooks.join(comma);
    } else {
        value = '';
    }

    return value;
};

const getHookName = (hook) => {
    hook = hook.trim().toLowerCase();

    switch (hook) {
        case 'changes':
        case 'onchanges':
            return 'OnChanges';
        case 'check':
        case 'docheck':
            return 'DoCheck';
        case 'destroy':
        case 'ondestroy':
            return 'OnDestroy';
        case 'init':
        case 'oninit':
            return 'OnInit';
    }
};

const setLifecycleImplements = (value) => {
    let implementers = '';

    if (value.length > 0) {
        implementers = ` implements ${value.replace(/^, /, '')}`;
    }

    return implementers;
};

const setLifecycleMethods = (value) => {
    let methods = '\n';

    if (value) {
        methods = value.replace(/^, /, '').split(',').reduce((result, method) =>
            `${result}\n    ng${method.trim()}() {\n    }\n`,
        methods );
    }

    return methods;
};

const getTemplates = (rootDir) => {
    const componentDir = path.resolve(rootDir, 'src', '{{ selector }}');

    return utilities.getTemplates(rootDir, __dirname, [
        {
            destination: path.resolve(componentDir, '{{ selector }}.component.ts'),
            name: 'app.ts'
        },
        {
            destination: path.resolve(componentDir, '{{ selector }}.component.spec.ts'),
            name: 'spec.ts'
        },
        {
            blank: true,
            check: checkForStylesFile,
            destination: path.resolve(componentDir, '{{ selector }}.component.scss')
        },
        {
            blank: true,
            check: checkForTemplateFile,
            destination: path.resolve(componentDir, '{{ selector }}.component.html')
        }
    ]);
};

const checkForStylesFile = (answers) => !checkIsInline(answers, 'styles');
const checkForTemplateFile = (answers) => !checkIsInline(answers, 'template');
const checkIsInline = (answers, type) => {
    const answer = answers.find((answer) => answer.name === type);

    return answer.answer === '``';
}

const notifyUser = (answers) => {
    const componentName = answers.find((answer) => answer.name === 'componentName');
    const selector = answers.find((answer) => answer.name === 'selector');

    console.info(`\nDon't forget to add the following to the module.ts file:`);
    console.info(`    import { ${componentName.answer} } from './${selector.answer}/${selector.answer}.component';`);
    console.info(`And to add ${componentName.answer} to the NgModule declarations list`);
};