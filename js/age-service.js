(function (global) {
  'use strict';

  function calculateInternationalAge(solarBirthDate, targetDate) {
    let age = targetDate.year - solarBirthDate.year;
    const birthdayPassed = targetDate.month > solarBirthDate.month
      || (targetDate.month === solarBirthDate.month && targetDate.day >= solarBirthDate.day);
    if (!birthdayPassed) age -= 1;
    return age;
  }

  function formatAge(age) {
    return age < 0 ? '출생 전' : `만 ${age}세`;
  }

  global.LunarBirthdayApp.AgeService = Object.freeze({ calculateInternationalAge, formatAge });
})(window);
