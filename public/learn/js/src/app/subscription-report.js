const subscriptionReport = (() => {

    const requestInfo = async (token) => {
        const fetchOptions = {
          method: 'POST'
        };
    
        if (token) {
          fetchOptions.headers = { Authorization: `Bearer ${token}` };
          try {
            const result = await fetch(`/learn/api/subscription-report/`, fetchOptions);
            if (result.status === 204) return null;
            return await result.json();
          } catch (error) {
            console.error(error);
          }
        }
    
        return null;
      };

    const removeLoading = () => {
        const elem = document.querySelector('[data-report-loading]');
        if (!elem) return;
        elem.parentNode.removeChild(elem);
    };

    const addNoAccess = (message, addSignInLink) => {
        const elem = document.querySelector('[data-report]');
        if (!elem) return;
        removeLoading();

        if (addSignInLink) {
            const link = document.createElement('a');
            link.classList.add('call-to-action');
            link.setAttribute('href', `${window.appUrl || 'https://app.kontent.ai'}/sign-in`);
            link.setAttribute('target', '_blank');
            link.innerHTML = `<span>${window.UIMessages.signIn}</span><span></span>`;
            elem.prepend(link);
        }

        const item = document.createElement('div');
        item.classList.add('report__no-access');
        item.innerHTML = `<p>${message}</p>`;
        elem.prepend(item);
    };

    const renderSubscriptionsFilter = (data) => {
        const container = document.querySelector('[data-report-subscriptions]');
        if (!container) return;

        const subscriptions = [];
        const filterState = {
            subscriptions: [],
            courses: {
                prop: 'userName',
                type: 'string',
                direction: 'asc'
            },
            certifications: {
                prop: 'userName',
                type: 'string',
                direction: 'asc'
            },
        };

        data.forEach((item) => {
            item.subscriptions.forEach((sub) => {
                if (!subscriptions.some((subItem) => sub.id === subItem.id)) {
                    subscriptions.push(sub);
                    filterState.subscriptions.push(sub.id);
                }
            });
        });

        container.innerHTML = `
            <filedset class="report__filter">
                <legend>${window.UIMessages.pickSubscription}</legend>
                ${subscriptions.map((item) => {
                    return `<div class="report__filter-row"><input type="checkbox" id="${item.id}" name="${item.id}" value="${item.id}" checked><label for="${item.id}">${item.name}</label></div>`;
                }).join('')}
            </filedset>
        `;

        return filterState;
    };

    const formatProgress = (progress) => {
        switch (progress.toLowerCase()) {
            case 'incomplete':
                return 'In progress';
            case 'completed':
                return 'Completed';
            default:
                return progress;
        }
    };

    const sortBy = (data, prop, type, direction) => {
        data.sort((a, b) => {
            if (type === 'date') { 
                a[prop] = a[prop] ? new Date(a[prop]).getTime() : 0;
                b[prop] = b[prop] ? new Date(b[prop]).getTime() : 0;
            }

            if (direction === 'desc') {
                if (a[prop] > b[prop]) return -1;
                if (a[prop] < b[prop]) return 1;
                return 0;
            }

            if (direction === 'asc') {
                if (a[prop] < b[prop]) return -1;
                if (a[prop] > b[prop]) return 1;
                return 0;
            }

            return 0;
        });
        return data;
    };

    const getStateDefaultSubscriptions = (data) => {
        let courses = [];
        data.forEach((user) => {
            user.courses.forEach((course) => {
                courses.push({
                    subscriptions: user.subscriptions.map(item => item.id),
                    email: user.email,
                    userName: [user.firstName, user.lastName].filter(item => item).join(' '),
                    title: course.title,
                    progress: formatProgress(course.progress),
                    completedDate: course.completedDate || null,
                    completedDateFormatted: course.completedDateFormatted || null,
                    topic: course.topic.map(item => item.name).sort().join(', '),
                })
            }); 
        });

        courses = sortBy(courses, 'userName', 'string', 'asc');

        return courses;
    };

    const setThDirection = (table, prop) => {
        if (window.stateFilter[table].prop === prop) {
            return `data-direction="${window.stateFilter[table].direction}"`;
        }
        return '';
    };

    const renderCourses = (courses) => {
        const container = document.querySelector('[data-report-courses]');
        if (!container) return;

        container.innerHTML = `
            <h2 class="report__heading">${window.UIMessages.coursesReportTitle}</h2>
            <table>
                <thead>
                    <tr>
                        <th class="narrow" data-prop="topic" ${setThDirection('courses', 'topic')}>Topic name</th>
                        <th data-prop="title" ${setThDirection('courses', 'title')}>Course name</th>
                        <th data-prop="userName" ${setThDirection('courses', 'userName')}>User name</th>
                        <th data-prop="email" ${setThDirection('courses', 'email')}>User email</th>
                        <th class="narrow" data-prop="progress" ${setThDirection('courses', 'progress')}>Completion</th>
                        <th class="narrow" data-type="date" data-prop="completedDate" ${setThDirection('courses', 'completedDate')}>Completion date</th>
                    </tr>
                </thead>
                <tbody>
                    ${courses.map((item) => {
                        return `

                            <tr>
                                <td class="narrow">${item.topic}</td>
                                <td>${item.title}</td>
                                <td>${item.userName}</td>
                                <td>${item.email}</td>
                                <td class="narrow">${item.progress}</td>   
                                <td class="narrow">${item.completedDateFormatted || ''}</td>
                            </tr>
                            `;
                    }).join('')}
                </tbody>
            </table>
            <p class="report__note">${window.UIMessages.numberOfCompletions} ${courses.filter(item => item.completedDate).length}</p>
        `;
    };

    const getCertificationPassed = (certification) => {
        if (!!certification.expiration) {
            if (certification.hasExpired){
                return 'Expired';
            }
            return 'Passed';
        }
        return 'Failed';
    };
    
    const getStateDefaultCertifications = (data) => {
        let certifications = [];
        data.forEach((user) => {
            user.certifications.forEach((certification) => {
                certifications.push({
                    subscriptions: user.subscriptions.map(item => item.id),
                    email: user.email,
                    userName: [user.firstName, user.lastName].filter(item => item).join(' '),
                    title: certification.title,
                    passed: getCertificationPassed(certification),
                    date: certification.date || null,
                    dateFormatted: certification.dateFormatted || null,
                    expiration: certification.expiration || null,
                    expirationFormatted: certification.expirationFormatted || null,
                    hasExpired: certification.hasExpired,
                })
            });
        });

        certifications = sortBy(certifications, 'userName', 'string', 'asc');

        return certifications;
    };

    const renderCertifications = (certifications) => {
        const container = document.querySelector('[data-report-certifications]');
        if (!container) return;

        container.innerHTML = `
            <h2 class="report__heading">${window.UIMessages.certificationsReportTitle}</h2>
            <table>
                <thead>
                    <tr>
                        <th data-prop="title" ${setThDirection('certifications', 'title')}>Certification name</th>
                        <th data-prop="userName" ${setThDirection('certifications', 'userName')}>User name</th>
                        <th data-prop="email" ${setThDirection('certifications', 'email')}>User email</th>
                        <th class="narrow" data-prop="passed" ${setThDirection('certifications', 'passed')}>Success</th>
                        <th class="narrow" data-type="date" data-prop="date" ${setThDirection('certifications', 'date')}>Attempt date</th>
                        <th class="narrow" data-type="date" data-prop="expiration" ${setThDirection('certifications', 'expiration')}>Expiration date</th>
                    </tr>
                </thead>
                <tbody>
                    ${certifications.map((item) => {
                        return `
                            <tr>
                                <td>${item.title}</td>
                                <td>${item.userName}</td>
                                <td>${item.email}</td>
                                <td class="narrow">${item.passed}</td>
                                <td class="narrow">${item.dateFormatted || ''}</td>   
                                <td class="narrow">${item.expirationFormatted || ''}</td>
                            </tr>
                            `;
                    }).join('')}
                </tbody>
            </table>
            <p class="report__note">${window.UIMessages.numberOfCompletions} ${certifications.filter(item => !!(item.expiration && !item.hasExpired)).length}</p>
        `;
    };

    const updateStateBysubscriptions = () => {
        const container = document.querySelector('[data-report-subscriptions]');
        if (!container) return;

        container.addEventListener('change', (e) => {
            const { target } = e;
            if (target.type !== 'checkbox') return;

            if (target.checked) {
                if (!window.stateFilter.subscriptions.includes(target.value)) {
                    window.stateFilter.subscriptions.push(target.value);
                }
            } else {
                window.stateFilter.subscriptions = stateFilter.subscriptions.filter((item) => item !== target.value);
            }

            const event = new Event('reportFilterUpdated');
            document.querySelector('body').dispatchEvent(event);
        });
    };

    const getDirection = (target) => {
        const direction = target.getAttribute('data-direction');
        let result = 'desc';
        if (direction === 'desc' || !direction) {
            result = 'asc';
        }

        return result;
    };

    const updateStateByTable = (containerSelector) => {
        const container = document.querySelector(containerSelector);
        if (!container) return;

        let prop = 'courses';

        if (containerSelector.includes('certifications')) {
            prop = 'certifications';
        }

        container.addEventListener('click', (e) => {
            const { target } = e;
            if (target.tagName !== 'TH') return;

            window.stateFilter[prop].type = 'string';
            if (target.getAttribute('data-type') === 'date') {
                window.stateFilter[prop].type = 'date';
            }
            window.stateFilter[prop].prop = target.getAttribute('data-prop');
            window.stateFilter[prop].direction = getDirection(target);

            const event = new Event('reportFilterUpdated');
            document.querySelector('body').dispatchEvent(event);
        });
    };

    const rerenderByFilter = (stateCourses, stateCertifications) => {
        document.querySelector('body').addEventListener('reportFilterUpdated', () => {
            let stateCoursesFiltered = stateCourses.filter((item) => {
                return item.subscriptions.some((sub) => window.stateFilter.subscriptions.includes(sub));
            });

            stateCoursesFiltered = sortBy(stateCoursesFiltered, window.stateFilter.courses.prop, window.stateFilter.courses.type, window.stateFilter.courses.direction);

            renderCourses(stateCoursesFiltered);

            let stateCertificationsFiltered = stateCertifications.filter((item) => {
                return item.subscriptions.some((sub) => window.stateFilter.subscriptions.includes(sub));
            });

            stateCertificationsFiltered = sortBy(stateCertificationsFiltered, window.stateFilter.certifications.prop, window.stateFilter.certifications.type, window.stateFilter.certifications.direction);

            renderCertifications(stateCertificationsFiltered);
        });
    }

    const getInfo = async () => {
        const container = document.querySelector('[data-report]');
        if (!container) return;
        const token = window.user ? window.user.__raw : null;
        if (!token) {
            addNoAccess(window.UIMessages.notSignedIn, true);
            return;
        }

        subscriptionAdminReport = await requestInfo(token);

        if (subscriptionAdminReport === null) {
            addNoAccess(window.UIMessages.noAccess);
            return
        }

        if (subscriptionAdminReport && !subscriptionAdminReport.length) {
            addNoAccess(window.UIMessages.noElearningPackage);
            return;
        }

        if (subscriptionAdminReport && subscriptionAdminReport.length) {
            removeLoading();

            window.stateFilter = renderSubscriptionsFilter(subscriptionAdminReport);

            const stateDefaultCourses = getStateDefaultSubscriptions(subscriptionAdminReport);
            renderCourses(stateDefaultCourses);

            const stateDefaultCertifications = getStateDefaultCertifications(subscriptionAdminReport);
            renderCertifications(stateDefaultCertifications);

            updateStateBysubscriptions();
            updateStateByTable('[data-report-courses]');
            updateStateByTable('[data-report-certifications]');

            rerenderByFilter(stateDefaultCourses, stateDefaultCertifications);
        }
    };

    return {
        getInfo
    }
})();