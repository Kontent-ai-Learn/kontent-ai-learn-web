const subscriptionReport = (() => {

    const requestInfo = async (token) => {
        const fetchOptions = {
          method: 'POST'
        };
    
        if (token) {
          fetchOptions.headers = { Authorization: `Bearer ${token}` };
          try {
            const result = await fetch(`/learn/api/subscription-report/`, fetchOptions);
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

    const addNoAccess = () => {
        const elem = document.querySelector('[data-report-loading][data-report-noaccess]');
        if (!elem) return;
        elem.removeAttribute('data-report-loading');
    };

    const renderSubscriptionsFilter = (data) => {
        const container = document.querySelector('[data-report-subscriptions]');
        if (!container) return;

        const subscriptions = [];
        data.forEach((item) => {
            item.subscriptionIds.forEach((sub) => {
                if (!subscriptions.includes(sub)) {
                    subscriptions.push(sub);
                }
            });
        });

        container.innerHTML = `
            <filedset>
                <legend>${window.UIMessages.pickSubscription}</legend>
                ${subscriptions.map((item) => {
                    return `<input type="checkbox" id="${item}" name="${item}" value="${item}" checked><label for="${item}">${item}</label>`;
                }).join('')}
            </filedset>
        `;
    };

    const formatProgress = (progress) => {
        switch (progress.toLowerCase()) {
            case 'incomplete':
                return 'In-progress';
            case 'completed':
                return 'Completed';
            default:
                return progress;
        }
    }

    const renderCourses = (data) => {
        const container = document.querySelector('[data-report-courses]');
        if (!container) return;

        const courses = [];
        data.forEach((user) => {
            user.courses.forEach((course) => {
                courses.push({
                    email: user.email,
                    title: course.title,
                    progress: formatProgress(course.progress),
                    completedDate: course.completedDate || null,
                    topic: course.topic.map(item => item.name).sort().join(', '),
                })
            });
        });

        courses.sort((a, b) => {
            if (a.topic < b.topic) return -1;
            if (a.topic > b.topic) return 1;
            return 0;
        });

        container.innerHTML = `
            <h2>${window.UIMessages.coursesReportTitle}</h2>
            <table>
                <thead>
                    <tr>
                        <th>Topic name</th>
                        <th>Course name</th>
                        <th>User name</th>
                        <th>Completion</th>
                        <th>Completion date</th>
                    </tr>
                </thead>
                <tbody>
                    ${courses.map((item) => {
                        return `

                            <tr>
                                <td>${item.topic}</td>
                                <td>${item.title}</td>
                                <td>${item.email}</td>
                                <td>${item.progress}</td>   
                                <td>${item.completedDate || ''}</td>
                            </tr>
                            `;
                    }).join('')}
                </tbody>
            </table>
            <p>${window.UIMessages.numberOfCompletions} ${courses.filter(item => item.completedDate).length}.</p>
        `;
    };

    const renderCertifications = (data) => {
        const container = document.querySelector('[data-report-certifications]');
        if (!container) return;

        const certifications = [];
        data.forEach((user) => {
            user.certifications.forEach((certification) => {
                certifications.push({
                    email: user.email,
                    title: certification.title,
                    date: certification.date || null,
                    expiration: certification.expiration || null,
                })
            });
        });

        certifications.sort((a, b) => {
            if (a.title < b.title) return -1;
            if (a.title > b.title) return 1;
            return 0;
        });

        container.innerHTML = `
            <h2>${window.UIMessages.certificationsReportTitle}</h2>
            <table>
                <thead>
                    <tr>
                        <th>Certification name</th>
                        <th>User name</th>
                        <th>Success</th>
                        <th>Attempt date</th>
                        <th>Expiration date</th>
                    </tr>
                </thead>
                <tbody>
                    ${certifications.map((item) => {
                        return `

                            <tr>
                                <td>${item.title}</td>
                                <td>${item.email}</td>
                                <td>${!!item.expiration ? 'Passed' : 'Failed'}</td>
                                <td>${item.date || ''}</td>   
                                <td>${item.expiration || ''}</td>
                            </tr>
                            `;
                    }).join('')}
                </tbody>
            </table>
            <p>${window.UIMessages.numberOfCompletions} ${certifications.filter(item => item.expiration).length}.</p>
        `;
    };

    const getInfo = async () => {
        const container = document.querySelector('[data-report]');
        if (!container) return;
        const token = window.user ? window.user.__raw : null;
        subscriptionAdminReport = await requestInfo(token);
        if (subscriptionAdminReport) {
            removeLoading();
            renderSubscriptionsFilter(subscriptionAdminReport);
            renderCourses(subscriptionAdminReport);
            renderCertifications(subscriptionAdminReport);
        } else {
            addNoAccess();
        }
    };

    return {
        getInfo
    }
})();