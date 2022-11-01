const elearningRegistration = require('./registration');
const cacheHandle = require('../cache/handle');
const getContent = require('../kontent/getContent');
const getUrlMap = require('../general/urlMap');
const isPreview = require('../kontent/isPreview');
const { isCodenameInMultipleChoice } = require('../general/helper');
const certificationDetail = require('../certification/detail');
const helper = require('../general/helper');

const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Europe/Prague');

const getScormRegistration = (id, registrations) => {
  for (let i = 0; i < registrations.length; i++) {
    const courseId = registrations[i].courseId.replace('dev_', '').replace('_preview', '');
    if (courseId === id) {
      return registrations[i];
    }
  }
  return null;
};

const getCertificate = (registration, course) => {
  if (!registration) return null;
  if (registration.status === 'COMPLETED') {
    return {
      url: `/learn/get-certified/course/${registration.registrationId}/certificate/`,
      name: course.elements.title.value,
      issued: dayjs.tz(registration.completedDate).format('YYYY/MM/DD'),
      expiration: null,
    };
  }
  return null;
};

const getCourseUrl = (registration, course, urlMap) => {
  const mapItem = urlMap.find(item => item.codename === course.system.codename);
  if (!mapItem) return null;

  if (registration) {
    return `${mapItem.url}?id=${registration.registrationId}`;
  } else {
    return `${mapItem.url}?enroll`;
  }
};

const getLabel = (registration, UIMessages, res) => {
  if (isPreview(res.locals.previewapikey)) {
    return helper.getValue(UIMessages, 'training___cta_preview_course');
  }

  if (!registration) return helper.getValue(UIMessages, 'training___cta_start_course');
  const codename = registration.status;

  switch (codename) {
    case 'COMPLETED': return helper.getValue(UIMessages, 'training___cta_revisit_course');
    case 'INCOMPLETE': return helper.getValue(UIMessages, 'training___cta_resume_course');
    default: return helper.getValue(UIMessages, 'training___cta_start_course');
  }
};

const getProgress = (registration, UIMessages, res) => {
  let messageCodename = '';
  if (!registration) {
    messageCodename = 'training___course_status_unknown';
  } else {
    let codename = registration.status;

    if (isPreview(res.locals.previewapikey)) {
      codename = 'PREVIEW';
    }

    switch (codename) {
      case 'PREVIEW': messageCodename = 'training___course_status_preview'; break;
      case 'COMPLETED': messageCodename = 'training___course_status_completed'; break;
      case 'INCOMPLETE': messageCodename = 'training___course_status_incomplete'; break;
      default: messageCodename = 'training___course_status_unknown'; break;
    }
  }
  return {
    name: UIMessages.elements[messageCodename].value,
    codename: messageCodename
  };
};

const init = async (req, res) => {
  const elearningUser = require('./user');
  const urlMap = await cacheHandle.ensureSingle(res, 'urlMap', async () => {
    return await getUrlMap(res);
  });
  const UIMessagesObj = await cacheHandle.ensureSingle(res, 'UIMessages', async () => {
    return await getContent.UIMessages(res);
  });
  const UIMessages = UIMessagesObj && UIMessagesObj.length ? UIMessagesObj[0] : null;

  const state = {
    courses: [],
    exams: []
  };

  if (!req?.user?.email) return { message: 'User is not authenticated.' };
  const user = await elearningUser.getUser(req.user.email, res);

  if (user.code) {
    if (user.code === 'CR404') {
      state.code = 1; // User is not available in Subscription service
      state.message = helper.getValue(UIMessages, 'sign_in_error_subscription_missing_text');
    } else {
      state.code = 2; // Unknown error
      state.message = helper.getValue(UIMessages, 'sign_in_error_text');
    }
    return state;
  }

  if (!await elearningUser.userHasElearningAccess(user, res)) {
    state.code = 3; // User has not e-learning access
    state.message = helper.getValue(UIMessages, 'training___no_subscription_info');
  }

  const trainingCourses = await cacheHandle.evaluateSingle(res, 'trainingCourses', async () => {
    return await getContent.trainingCourse(res);
  });
  const userRegistartions = await elearningRegistration.getUserRegistrations(user.email, res);

  if (!state.code) {
    state.code = 4; // User has e-learning access;
    state.message = '';
  }

  const lastAccess = userRegistartions
  .filter(item => item.lastAccessDate && item.status !== 'COMPLETED')
  .sort((a, b) => {
    return new Date(b.lastAccessDate) - new Date(a.lastAccessDate);
  });
  const lastAccessId = lastAccess?.[0]?.courseId.replace('dev_', '').replace('_preview', '');

  for (let i = 0; i < trainingCourses.length; i++) {
    const isFree = isCodenameInMultipleChoice(trainingCourses[i].elements.is_free.value, 'yes');
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
      isFree: isFree,
      progress: getProgress(registration, UIMessages, res)
    })
  }

  if (state.code === 4) {
    const certificationTests = await cacheHandle.evaluateSingle(res, 'trainingCertificationTests', async () => {
      return await getContent.certificationTest(res);
    });

    for await (const test of certificationTests.items) {
      const exam = await certificationDetail.getCertificationInfo(user, test);
      state.exams.push(exam);
    }
  }

  return state;
};

const registration = async (req, res) => {
  const scorm = require('../services/scorm');
  const elearningUser = require('./user');
  const courseId = req.body.id;
  const trainingCourses = await cacheHandle.evaluateSingle(res, 'trainingCourses', async () => {
    return await getContent.trainingCourse(res);
  });
  const course = trainingCourses.find(item => item.system.id === courseId);
  let isFree = false;
  if (course) {
    isFree = isCodenameInMultipleChoice(course.elements.is_free.value, 'yes');
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
  registration,
  getScormRegistration,
  getCertificate,
  getProgress,
  getLabel,
  getCourseUrl
};
