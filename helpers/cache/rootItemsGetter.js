const ROOT_CONTENT_TYPES = ['article', 'training_course2', 'training_survey', 'training_certification_test'];

const getRootCodenamesOfSingleItem = (item, allItems) => {
    if (ROOT_CONTENT_TYPES.includes(item.type)) {
        return [];
    }

    return getRootParents(item.codename, allItems);
};

const getRootParents = (codename, allItems) => {
    let itemsToVisit = getDirectParents(codename, allItems);
    const visitedItems = [];
    const rootItemCodenames = [];

    while (itemsToVisit.length > 0) {
        const newItemsToVisit = [];

        itemsToVisit.forEach(item =>
            processItem(item, { visitedItems, rootItemCodenames, newItemsToVisit, allItems }));

        itemsToVisit = newItemsToVisit;
    }

    return rootItemCodenames;
};

const processItem = (item, context) => {
    const itemCodename = item.system.codename;

    if (context.visitedItems.includes(itemCodename)) {
        return;
    }
    context.visitedItems.push(itemCodename);

    if (ROOT_CONTENT_TYPES.includes(item.system.type)) {
        context.rootItemCodenames.push(itemCodename);
    } else {
        const parents = getDirectParents(itemCodename, context.allItems);
        parents.forEach(item => context.newItemsToVisit.push(item));
    }
}

const getDirectParents = (codename, allItems) => {
    return allItems.filter(item => checkIfItemIsParent(item, codename));
};

const checkIfItemIsParent = (item, codename) => {
    switch (item.system.type) {
        case 'code_samples':
            return item.code_samples.itemCodenames.includes(codename);
        case 'article':
            return item.content.linkedItemCodenames.includes(codename) ||
                   item.introduction.linkedItemCodenames.includes(codename);
        case 'training_course2':
            return item.description.linkedItemCodenames.includes(codename);
        case 'callout':
        case 'content_chunk':
            return item.content.linkedItemCodenames.includes(codename);
        case 'training_survey':
            return item.survey_questions.linkedItemCodenames.includes(codename);
        case 'training_certification_test':
            return item.question_groups.itemCodenames.includes(codename) ||
                   item.description.linkedItemCodenames.includes(codename) ||
                   item.success_message.linkedItemCodenames.includes(codename) ||
                   item.failure_message.linkedItemCodenames.includes(codename);
        case 'training_question_group':
            return item.questions.itemCodenames.includes(codename);
        case 'training_question_for_survey_and_test':
            return item.answers.linkedItemCodenames.includes(codename);
        default:
            return false;
    }
};

module.exports = getRootCodenamesOfSingleItem;