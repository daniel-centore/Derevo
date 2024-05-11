import { merge } from 'lodash';

// Based on https://github.com/danielhusar/from-now/blob/master/index.js

type TimeFormat = string | Record<number, string>;

type Format = {
  minutes?: TimeFormat;
  hours?: TimeFormat;
  days?: TimeFormat;
  weeks?: TimeFormat;
  months?: TimeFormat;
  years?: TimeFormat;
};

const defaults: Format = {
  minutes: {
    1: ' minute',
    2: ' minutes',
  },
  hours: {
    1: ' hour',
    2: ' hours',
  },
  days: {
    1: ' day',
    2: ' days',
  },
  weeks: {
    1: ' week',
    2: ' weeks',
  },
  months: {
    1: ' month',
    2: ' months',
  },
  years: {
    1: ' year',
    2: ' years',
  },
};

const getUnit = (interval: number, unit: keyof Format, opts: Format) => {
  let ret;

  if (typeof opts[unit] === 'string') {
    return opts[unit];
  }

  const option = opts[unit];
  if (option) {
    Object.keys(option).forEach((key) => {
      const keyAsNumber = Number.parseInt(key, 10);
      if (keyAsNumber <= interval) {
        ret = option[keyAsNumber];
      }
    });
  }

  return ret;
};

export const fromNow = (date: Date | string, optsInput?: Format) => {
  const past = date instanceof Date ? date : new Date(date);
  const now = new Date();
  const opts = merge({}, defaults, optsInput);

  if (!date) {
    throw new TypeError('Failed to parse the date');
  }

  const seconds = Math.floor((now.getTime() - past.getTime()) / 1000);
  let interval = Math.floor(seconds / 31536000);

  if (seconds < 0) {
    throw new TypeError('Please put date in past');
  }

  if (interval >= 1) {
    return `${interval}${getUnit(interval, 'years', opts)}`;
  }

  interval = Math.floor(seconds / 2592000);
  if (interval >= 1) {
    return `${interval}${getUnit(interval, 'months', opts)}`;
  }

  interval = Math.floor(seconds / (86400 * 7));
  if (interval >= 1) {
    return `${interval}${getUnit(interval, 'weeks', opts)}`;
  }

  interval = Math.floor(seconds / 86400);
  if (interval >= 1) {
    return `${interval}${getUnit(interval, 'days', opts)}`;
  }

  interval = Math.floor(seconds / 3600);
  if (interval >= 1) {
    return `${interval}${getUnit(interval, 'hours', opts)}`;
  }

  interval = Math.floor(seconds / 60);
  return `${interval}${getUnit(interval, 'minutes', opts)}`;
};
