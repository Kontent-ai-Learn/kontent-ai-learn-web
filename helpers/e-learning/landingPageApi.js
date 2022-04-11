const moment = require('moment');
const elearningUser = require('./user');
const elearningScorm = require('./scorm');
const cacheHandle = require('../cache/handle');
const getContent = require('../kontent/getContent');
const getUrlMap = require('../general/urlMap');
const isPreview = require('../kontent/isPreview');
const scorm = require('../services/scorm');
const { isCodenameInMultipleChoice } = require('../general/helper');

const getScormRegistration = (id, registrations) => {
  for (let i = 0; i < registrations.length; i++) {
    const courseId = registrations[i].course.id.replace('dev_', '').replace('_preview', '');
    if (courseId === id) {
      return registrations[i];
    }
  }
  return null;
};

const getCertificate = (registration, course) => {
  if (!registration) return null;
  if (registration.activityDetails?.activityCompletion === 'COMPLETED') {
    return {
      url: `/learn/get-certified/course/${registration.id}/certificate/`,
      name: course.title.value,
      issued: moment(registration.completedDate).format('YYYY/MM/DD'),
      expiration: null,
    };
  }
  return null;
};

const getCourseUrl = (registration, course, urlMap) => {
  const mapItem = urlMap.find(item => item.codename === course.system.codename);
  if (!mapItem) return null;

  if (registration) {
    return `${mapItem.url}?id=${registration.id}`;
  } else {
    return `${mapItem.url}?enroll`;
  }
};

const getLabel = (registration, UIMessages, res) => {
  if (!registration) return UIMessages.training___cta_start_course.value;
  let codename = registration.activityDetails?.activityCompletion;

  if (isPreview(res.locals.previewapikey)) {
    codename = 'PREVIEW';
  }

  switch (codename) {
    case 'PREVIEW': return UIMessages.training___cta_preview_course.value
    case 'COMPLETED': return UIMessages.training___cta_revisit_course.value;
    case 'INCOMPLETE': return UIMessages.training___cta_resume_course.value;
    default: return UIMessages.training___cta_start_course.value;
  }
}

const init = async (req, res) => {
  const urlMap = await cacheHandle.ensureSingle(res, 'urlMap', async () => {
    return await getUrlMap(res);
  });
  const UIMessagesObj = await cacheHandle.ensureSingle(res, 'UIMessages', async () => {
    return await getContent.UIMessages(res);
  });
  const UIMessages = UIMessagesObj && UIMessagesObj.length ? UIMessagesObj[0] : null;

  const state = {};
  if (!req?.user?.email) return { message: 'User is not authenticated.' };
  const user = await elearningUser.getUser(req.user.email, res);

  if (user.code) {
    if (user.code === 'CR404') {
      state.code = 1; // User is not available in Subscription service
      state.message = UIMessages.sign_in_error_subscription_missing_text.value;
    } else {
      state.code = 2; // Unknown error
      state.message = UIMessages.sign_in_error_text.value;
    }
    return state;
  }

  if (!await elearningUser.userHasElearningAccess(user, res)) {
    state.code = 3; // User has not e-learning access
    state.message = UIMessages.training___cta_buy_course.value;
  }

  const trainingCourses = await cacheHandle.evaluateSingle(res, 'trainingCourses', async () => {
    return await getContent.traniningCourse(res);
  });
  const userRegistartions = await elearningScorm.getUserRegistrations(user.email);

  if (!state.code) {
    state.code = 4; // User has e-learning access;
    state.message = '';
  }
  state.courses = [];

  const lastAccess = userRegistartions
  .filter(item => item.lastAccessDate && item.activityDetails?.activityCompletion !== 'COMPLETED')
  .sort((a, b) => {
    return new Date(b.lastAccessDate) - new Date(a.lastAccessDate);
  });
  const lastAccessId = lastAccess?.[0]?.course.id.replace('dev_', '').replace('_preview', '');

  for (let i = 0; i < trainingCourses.length; i++) {
    const isFree = isCodenameInMultipleChoice(trainingCourses[i].is_free.value, 'yes');
    if (state.code === 3 && !isFree) continue;
    const registration = getScormRegistration(trainingCourses[i].system.id, userRegistartions);
    const url = getCourseUrl(registration, trainingCourses[i], urlMap);
    const certificate = getCertificate(registration, trainingCourses[i]);
    const label = getLabel(registration, UIMessages, res);
    state.courses.push({
      id: trainingCourses[i].system.id,
      url: url,
      label: label,
      certificate: certificate,
      promoted: trainingCourses[i].system.id === lastAccessId,
      isFree: isFree
    })
  }

  return state;
};

const registration = async (req, res) => {
  const courseId = req.body.id;
  const trainingCourses = await cacheHandle.evaluateSingle(res, 'trainingCourses', async () => {
    return await getContent.traniningCourse(res);
  });
  const course = trainingCourses.find(item => item.system.id === courseId);
  let isFree = false;
  if (course) {
    isFree = isCodenameInMultipleChoice(course.is_free.value, 'yes');
  }

  const user = await elearningUser.getUser(req.user.email, res);
  if (user.code) return null;
  const hasAccess = await elearningUser.userHasElearningAccess(user, res);
  if (!(hasAccess || isFree)) return null;

  const link = await scorm.createRegistrationLink(user, courseId, res);

  return { url: link };
};

module.exports = {
  init,
  registration
};
