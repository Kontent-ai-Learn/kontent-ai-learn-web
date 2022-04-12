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

  const promoted = trainingCourses.find((item) => item.system.codename === content.promoted_course.value[0].system.codename);
  const topics = trainingTopicTaxonomyGroup.taxonomy.terms.map((topic) => {
    return {
      codename: topic.codename,
      name: topic.name,
      courses: courses.filter((course) => {
        return isCodenameInMultipleChoice(course.personas___topics__training_topic.value, topic.codename);
      })
    }
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
