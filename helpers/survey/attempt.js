const surveyData = require('./data');
const surveyDatabase = require('./database');
const cacheHandle = require('../cache/handle');
const getContent = require('../kontent/getContent');
const getUrlMap = require('../general/urlMap');
const elearningRegistration = require('../e-learning/registration');
const { isCodenameInMultipleChoice } = require('../general/helper');

const getSurveyCodename = async (currentCourse, allCourses, email) => {
  const LONG_CODENAME = 'long_survey';
  const SHORT_CODENAME = 'short_survey';

  if (currentCourse.pages.value.length > 1) {
    return LONG_CODENAME;
  }

  const currentCourseTopics = currentCourse.personas___topics__training_topic.value;
  const coursesInCurrentTopic = [];

  for (let i = 0; i < currentCourseTopics.length; i++) {
    const topicCourses = allCourses.filter((course) => {
      return isCodenameInMultipleChoice(course.personas___topics__training_topic.value, currentCourseTopics[i].codename);
    });
    coursesInCurrentTopic.push(...topicCourses);
  }

  const userRegistrations = await elearningRegistration.getUserRegistrations(email);
  const userRegistrationsCompleted = userRegistrations.filter((registration) => registration.activityDetails.activityCompletion === 'COMPLETED');

  const completedCoursesInTopic = [];
  for (let i = 0; i < coursesInCurrentTopic.length; i++) {
    for (let j = 0; j < userRegistrationsCompleted.length; j++) {
      const courseId = userRegistrationsCompleted[j].course.id.replace('dev_', '').replace('_preview', '');
      if (coursesInCurrentTopic[i].system.id === courseId) {
        completedCoursesInTopic.push(coursesInCurrentTopic[i]);
      }
    }
  }

  const uniqueCourses = [...new Set(completedCoursesInTopic.map(item => item.system.codename))];

  if (uniqueCourses.length % 3 === 0) {
    return LONG_CODENAME;
  }

  return SHORT_CODENAME;
};

const init = async (req, res) => {
  const scorm = require('../services/scorm');
  const elearningUser = require('../e-learning/user');
  let courseIdTrainingCourse = req.body.courseid.replace('_preview', '');
  courseIdTrainingCourse = courseIdTrainingCourse.replace('dev_', '');
  const trainingCourses = await cacheHandle.evaluateSingle(res, 'trainingCourses', async () => {
    return await getContent.trainingCourse(res);
  });
  const trainingCourse = trainingCourses.find(item => item.system.id === courseIdTrainingCourse);
  if (!trainingCourse) {
    return {
      code: 401,
      data: {
        redirect_url: null
      }
    }
  }

  const userCourseRegistration = await scorm.getUserCourseRegistration(req.body.email, req.body.courseid);
  const userCompletedCourse = userCourseRegistration?.registrationCompletion === 'COMPLETED';
  const userSubmittedSurvey = await surveyDatabase.getUserCourseAttempt(req.body);
  const user = await elearningUser.getUser(req.body.email, res);
  if (!(await elearningUser.isCourseAvailable(user, trainingCourse, res)) || !user || !trainingCourse || !userCompletedCourse || userSubmittedSurvey) {
    const urlMap = await cacheHandle.ensureSingle(res, 'urlMap', async () => {
      return await getUrlMap(res);
    });

    const urlMapItem = urlMap.find(item => item.codename === trainingCourse.system.codename);

    return {
      code: 401,
      data: {
        redirect_url: urlMapItem?.url || null
      }
    }
  }

  const codename = await getSurveyCodename(trainingCourse, trainingCourses, req.body.email);
  const survey = await cacheHandle.evaluateSingle(res, codename, async () => {
    return await getContent.survey(res, codename);
  });
  if (!survey.items.length) {
    return {
      code: 401,
      data: {
        redirect_url: null
      }
    }
  }
  const attempt = await surveyDatabase.createAttempt(req.body, user, survey);
  let code, data;

  const content = {
    title: JSON.stringify(survey.items[0].title.value),
    introduction: JSON.stringify(survey.items[0].short_introduction.value, res)
  };

  if (attempt && attempt.resource) {
    code = 200;
    data = attempt.resource;
  } else {
    code = 403;
    data = attempt;
  }

  return {
    code: code,
    content: content,
    data: data
  };
};

const handle = async (body) => {
  let attempt = await surveyDatabase.getAttempt(body.attempt);
  if (!attempt) return null;
  attempt = surveyData.evaluateAttempt(body, attempt);
  surveyDatabase.updateAttempt(attempt);

  return attempt;
};

module.exports = {
  init,
  handle
};
