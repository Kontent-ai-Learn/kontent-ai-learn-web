const surveyData = require('./data');
const surveyDatabase = require('./database');
const cacheHandle = require('../cache/handle');
const getContent = require('../kontent/getContent');
const getUrlMap = require('../general/urlMap');
const elearningRegistration = require('../e-learning/registration');
const { isCodenameInMultipleChoice, isNotEmptyRichText } = require('../general/helper');
const { getCertificate, getScormRegistration, getProgress, getLabel, getCourseUrl } = require('../e-learning/landingPageApi');

const getCoursesInCurrentTopic = (currentCourse, allCourses) => {
  const data = []
  const currentCourseTopics = currentCourse.personas___topics__training_topic.value;
  for (let i = 0; i < currentCourseTopics.length; i++) {
    const topicCourses = allCourses.filter((course) => {
      return isCodenameInMultipleChoice(course.personas___topics__training_topic.value, currentCourseTopics[i].codename);
    });
    data.push(...topicCourses);
  }
  return data;
};

const getNextCourses = (currentCourse, allCourses, userRegistrations, UIMessages, urlMap, res) => {
  const userRegistrationsCompleted = userRegistrations.filter((registration) => registration.activityDetails.activityCompletion === 'COMPLETED');

  const allIncompletedCourses = [];
  for (let i = 0; i < allCourses.length; i++) {
    let completed = false;
    for (let j = 0; j < userRegistrationsCompleted.length; j++) {
      const courseId = userRegistrationsCompleted[j].course.id.replace('dev_', '').replace('_preview', '');
      if (allCourses[i].system.id === courseId) {
          completed = true;
      }
    }
    if (!completed) {
      allIncompletedCourses.push(allCourses[i]);
    }
  }

  const coursesInCurrentTopic = getCoursesInCurrentTopic(currentCourse, allIncompletedCourses);

  let courses = [];
  const coursesRecommended = [];
  if (coursesInCurrentTopic.length) {
    courses = coursesInCurrentTopic;
  } else {
    courses = allIncompletedCourses;
  }

  for (let i = 0; i < courses.length; i++) {
    const currentRegistration = getScormRegistration(courses[i].system.id, userRegistrations);
    coursesRecommended.push({
      id: courses[i].system.id,
      title: courses[i].title.value,
      image: courses[i].thumbnail?.value?.[0]?.url,
      personas: courses[i].personas___topics__training_persona.value,
      isFree: isCodenameInMultipleChoice(courses[i].is_free.value, 'yes'),
      freeLabel: UIMessages.training___free_course_label.value,
      description: isNotEmptyRichText(courses[i].description.value) ? courses[i].description.value : '',
      detailsLabel: UIMessages.training___view_details.value,
      duration: courses[i].duration.value,
      url: getCourseUrl(currentRegistration, courses[i], urlMap),
      certificate: null,
      label: getLabel(currentRegistration, UIMessages, res),
      progress: getProgress(currentRegistration, UIMessages, res),
      promoted: false,
    })
  }

  return coursesRecommended;
};

const getSurveyCodename = async (currentCourse, allCourses, email) => {
  const LONG_CODENAME = 'long_survey';
  const SHORT_CODENAME = 'short_survey';

  if (currentCourse.pages.value.length > 1) {
    return LONG_CODENAME;
  }

  const coursesInCurrentTopic = getCoursesInCurrentTopic(currentCourse, allCourses);

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

const after = async (attempt, res) => {
  const data = {};
  data.messages = {};
  const UIMessages = await cacheHandle.ensureSingle(res, 'UIMessages', async () => {
    return await getContent.UIMessages(res);
  });

  if (UIMessages.length) {
    data.messages.thank_you = UIMessages[0].training___certificate___opening.value;
    data.messages.back_title = UIMessages[0].traning___button___overview.value;
  }

  const survey = await cacheHandle.evaluateSingle(res, attempt.codename, async () => {
    return await getContent.survey(res, attempt.codename);
  });

  if (survey.items.length) {
    data.messages.cta_message = survey.items[0].ui_message_and_cta.value;
  }

  const urlMap = await cacheHandle.ensureSingle(res, 'urlMap', async () => {
    return await getUrlMap(res);
  });

  const trainingCourses = await cacheHandle.evaluateSingle(res, 'trainingCourses', async () => {
    return await getContent.trainingCourse(res);
  });
  const courseId = attempt.course_id.replace('dev_', '').replace('_preview', '');
  const course = trainingCourses.find(item => item.system.id === courseId);
  const userRegistrations = await elearningRegistration.getUserRegistrations(attempt.email);
  const registration = getScormRegistration(courseId, userRegistrations);
  data.certificate = getCertificate(registration, course);
  data.courses = getNextCourses(course, trainingCourses, userRegistrations, UIMessages[0], urlMap, res);
  data.code = 4;
  return data;
};

module.exports = {
  init,
  handle,
  after
};
