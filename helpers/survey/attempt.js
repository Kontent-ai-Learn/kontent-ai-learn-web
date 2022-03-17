const elearningUser = require('../e-learning/user');
const surveyDatabase = require('./database');
const surveyData = require('./data');
const handleCache = require('../handleCache');
const commonContent = require('../commonContent');
const scorm = require('../scorm');
const getUrlMap = require('../urlMap');

const init = async (req, res) => {
  let courseIdTrainingCourse = req.body.courseid.replace('_preview', '');
  courseIdTrainingCourse = courseIdTrainingCourse.replace('dev_', '');
  const trainingCourses = await handleCache.evaluateSingle(res, 'trainingCourses', async () => {
    return await commonContent.getTraniningCourse(res);
  });
  const trainingCourse = trainingCourses.find(item => item.system.id === courseIdTrainingCourse);

  const userCourseRegistration = await scorm.getUserCourseRegistration(req.body.email, req.body.courseid);
  const userCompletedCourse = userCourseRegistration?.registrationCompletion === 'COMPLETED';
  const { user, trainingUser, errCode } = await elearningUser.getUser(req.body.email, res);
  if (!(await elearningUser.isCourseAvailable(user, trainingCourse, trainingUser, res)) || errCode || !trainingCourse || !userCompletedCourse) {
    const urlMap = await handleCache.ensureSingle(res, 'urlMap', async () => {
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

  const attempt = await surveyDatabase.createAttempt(req.body, user, res);
  let code, data;

  if (attempt && attempt.resource) {
    code = 200;
    data = attempt.resource;
  } else {
    code = 403;
    data = attempt;
  }

  return {
    code: code,
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
