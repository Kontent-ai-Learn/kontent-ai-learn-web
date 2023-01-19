const cacheHandle = require('../cache/handle');
const getContent = require('../kontent/getContent');
const { isCodenameInMultipleChoice } = require('../general/helper');

const getData = async (content, res) => {
  const trainingCourses = await cacheHandle.evaluateSingle(res, 'trainingCourses', async () => {
    return await getContent.trainingCourse(res);
  });
  const certificationTests = await cacheHandle.evaluateSingle(res, 'trainingCertificationTests', async () => {
    return await getContent.certificationTest(res);
  });
  const courses = [...trainingCourses, ...certificationTests.items];

  const trainingTopicTaxonomyGroup = await cacheHandle.evaluateSingle(res, 'trainingTopicTaxonomyGroup', async () => {
    return await getContent.trainingTopicTaxonomyGroup(res);
  });

  const promoted = trainingCourses.find((item) => item.system.codename === content.elements.promoted_course.linkedItems[0].system.codename);
  const topics = trainingTopicTaxonomyGroup.taxonomy.terms.map((topic) => {
    return {
      codename: topic.codename,
      name: topic.name,
      courses: courses
                .filter((course) => isCodenameInMultipleChoice(course.elements.personas___topics__training_topic.value, topic.codename))
                .sort((a, b) => (a.elements.title.value > b.elements.title.value) ? 1 : ((b.elements.title.value > a.elements.title.value) ? -1 : 0)),
      accessLevel: []
    }
  });

  topics.forEach((topic) => {
    const accessTopic = new Set();

    topic.courses.forEach((course) => {
      course.accessLevel = [];
      if (typeof course.elements.access === 'undefined') return;
      const accessCourse = new Set();
      switch (course.elements.access.value[0].codename) {
        case 'free':
        case 'clients_partners_employees':
          accessCourse.add('all');
          break;
        case 'partners_employees':
          accessCourse.add('partner');
          accessCourse.add('employee');
          break;
        case 'employees':
          accessCourse.add('employee');
          break;
        default:
          break;
      }

      course.accessLevel = Array.from(accessCourse);
      course.accessLevel.forEach((access) => accessTopic.add(access));
    });

    topic.accessLevel = Array.from(accessTopic);
    if (topic.accessLevel.includes('all')) topic.accessLevel = ['all'];
  });

  const data = {
    promoted: promoted,
    topics: topics
  };

  return data;
};

module.exports = {
  getData
};
