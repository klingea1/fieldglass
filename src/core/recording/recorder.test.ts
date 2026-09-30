import { describe, expect, it } from 'vitest';
import { Recorder, recordingFilename } from './recorder';

describe('Recorder', () => {
  it('ignores rows while not recording', () => {
    const recorder = new Recorder(['a']);
    recorder.push([1]);
    expect(recorder.count).toBe(0);
  });

  it('writes a header and rows as CSV', () => {
    const recorder = new Recorder(['time_s', 'x']);
    recorder.start();
    recorder.push([0, 1.5]);
    recorder.push([0.02, -2]);
    recorder.stop();
    expect(recorder.toCSV()).toBe('time_s,x\n0,1.5\n0.02,-2\n');
  });

  it('quotes fields that contain separators', () => {
    const recorder = new Recorder(['note']);
    recorder.start();
    recorder.push(['a, "b"']);
    expect(recorder.toCSV()).toBe('note\n"a, ""b"""\n');
  });

  it('rejects rows of the wrong width', () => {
    const recorder = new Recorder(['a', 'b']);
    recorder.start();
    expect(() => recorder.push([1])).toThrow();
  });

  it('clears rows on a new recording but keeps the start time after stopping', () => {
    const recorder = new Recorder(['a']);
    recorder.start();
    recorder.push([1]);
    recorder.stop();
    expect(recorder.startTime).not.toBeNull();
    recorder.start();
    expect(recorder.count).toBe(0);
  });
});

describe('recordingFilename', () => {
  it('builds a filesystem-safe name', () => {
    expect(recordingFilename('magnetometer', new Date('2026-09-30T14:05:09Z'))).toBe(
      'magnetometer-2026-09-30T14-05-09.csv',
    );
  });
});
