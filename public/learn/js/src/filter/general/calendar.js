window.calendar = (() => {
  const normalizeDateTime = (date) => {
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    return date;
  };

  const dateTimesElements = Array.from(document.querySelectorAll('[datetime]'));
  const dateTimes = dateTimesElements.map((item) => normalizeDateTime(new Date(item.getAttribute('datetime'))));

  const monthInDateTimes = (date) => {
    const normalizedDate = normalizeDateTime(date);
    const matching = dateTimes.filter((item) => {
      return item.getTime() === normalizedDate.getTime();
    });
    return matching.length > 0;
  };

  const getMinDate = () => {
    const sortedDateTimes = dateTimes.sort((a, b) => a.getTime() - b.getTime());
    return sortedDateTimes[0];
  };

  const getMaxDate = () => {
    const date = new Date();
    return normalizeDateTime(new Date(date.setMonth( date.getMonth() + 1)));
  };

  const addDataToggle = () => {
    setTimeout(() => {
      const cells = document.querySelectorAll('.air-datepicker-cell');
      cells.forEach((cell) => {
        if (cell.classList.contains('-disabled-') || !cell.classList.contains('-month-')) return;
        if (cell.classList.contains('-future-')) {
          cell.setAttribute('data-toggle', `.future`);
        } else {
          const month = parseInt(cell.getAttribute('data-month')) + 1;
          const year = cell.getAttribute('data-year');
          cell.setAttribute('data-toggle', `.date-${month}-${year}`);
        }
      });
    }, 0);
  };

  const locale = {
    days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    daysShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    daysMin: ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
    months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    today: 'Today',
    clear: 'Clear',
    dateFormat: 'MM/dd/yyyy',
    timeFormat: 'hh:mm aa',
    firstDay: 0
  };

  const init = () => {
    const minDate = getMinDate();
    const maxDate = getMaxDate();

    const calendar = new AirDatepicker('.calendar', {
      view: 'months',
      minView: 'months',
      dateFormat: 'M-yy',
      locale: locale,
      inline: true,
      visible: true,
      multipleDates: true,
      toggleSelected: true,
      minDate: minDate,
      maxDate: getMaxDate(),
      onRenderCell: ({ date, cellType }) => {
        date = normalizeDateTime(date);

        if (maxDate.getMonth() === date.getMonth() && maxDate.getYear() === date.getYear()) {
          return {
            html: 'Future',
            classes: '-future-'
          }
        }

        const minDateLocal = new Date(minDate.getTime());
        if (cellType === 'year') {
          minDateLocal.setMonth(0);
        }

        if (maxDate.getTime() < date.getTime() || minDateLocal.getTime() > date.getTime()) {
          return {
            html: '',
            classes: '-out-of-range-'
          }
        }

        if (!monthInDateTimes(date) && cellType === 'month') {
          return {
            disabled: true
          }
        }
      },
      onChangeViewDate: () => {
        addDataToggle();
      },
      onChangeView: () => {
        addDataToggle();
      }
    });

    addDataToggle();

    return calendar;
  };


  return {
    init
  }
})();