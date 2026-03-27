/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { ReactNode, useState, useEffect } from 'react';
import { Dayjs } from 'dayjs';
import { t } from '@apache-superset/core/translation';
import {
  NO_TIME_RANGE,
  useCSSTextTruncation,
  fetchTimeRange,
} from '@superset-ui/core';
import { css, styled, useTheme } from '@apache-superset/core/theme';
import {
  Button,
  Divider,
  RangePicker,
  Tooltip,
} from '@superset-ui/core/components';
import { extendedDayjs } from '@superset-ui/core/utils/dates';
import ControlHeader from 'src/explore/components/ControlHeader';
import { Icons } from '@superset-ui/core/components/Icons';
import { noOp } from 'src/utils/common';
import ControlPopover from '../ControlPopover/ControlPopover';
import { DateFilterControlProps } from './types';
import { DateFilterTestKey, useDefaultTimeFilter } from './utils';
import { DateLabel } from './components';

const DATE_FORMAT = 'YYYY-MM-DD';

const QUICK_PRESETS: { label: string; value: string }[] = [
  { label: t('Last day'), value: 'Last day' },
  { label: t('Last week'), value: 'Last week' },
  { label: t('Last month'), value: 'Last month' },
  { label: t('Last quarter'), value: 'Last quarter' },
  { label: t('Last year'), value: 'Last year' },
  { label: t('This month'), value: 'Current month' },
  { label: t('This year'), value: 'Current year' },
];

function parseActualRange(actual: string): [Dayjs, Dayjs] | null {
  const parts = actual.split(' : ');
  if (parts.length !== 2) return null;
  const start = extendedDayjs(parts[0].trim());
  const end = extendedDayjs(parts[1].trim());
  if (!start.isValid() || !end.isValid()) return null;
  return [start, end];
}

const ContentStyleWrapper = styled.div`
  ${({ theme }) => css`
    .ant-divider-horizontal {
      margin: 16px 0;
    }
    .section-title {
      font-weight: ${theme.fontWeightStrong};
      font-size: 15px;
      line-height: 24px;
      margin-bottom: 8px;
    }
    .presets {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 4px;
    }
    .footer {
      text-align: right;
    }
  `}
`;

const PresetTag = styled.div<{ active?: boolean }>`
  display: inline-block;
  padding: 2px 12px;
  border-radius: 12px;
  cursor: pointer;
  font-size: ${({ theme }) => theme.fontSizeSM}px;
  border: 1px solid
    ${({ active, theme }) => (active ? theme.colorPrimary : theme.colorBorder)};
  background: ${({ active, theme }) =>
    active ? theme.colorPrimaryBg : 'transparent'};
  color: ${({ active, theme }) =>
    active ? theme.colorPrimary : theme.colorText};
  &:hover {
    border-color: ${({ theme }) => theme.colorPrimary};
    color: ${({ theme }) => theme.colorPrimary};
  }
`;

const IconWrapper = styled.span`
  span {
    margin-right: ${({ theme }) => 2 * theme.sizeUnit}px;
    vertical-align: middle;
  }
  .text {
    vertical-align: middle;
  }
`;

export default function DateFilterLabel(props: DateFilterControlProps) {
  const {
    name,
    onChange,
    onOpenPopover = noOp,
    onClosePopover = noOp,
    isOverflowingFilterBar = false,
  } = props;
  const defaultTimeFilter = useDefaultTimeFilter();
  const value = props.value ?? defaultTimeFilter;

  const [show, setShow] = useState(false);
  const [timeRangeValue, setTimeRangeValue] = useState(value);
  const [pickerValue, setPickerValue] = useState<[Dayjs, Dayjs] | null>(null);
  const [actualTimeRange, setActualTimeRange] = useState(value);
  const [tooltipTitle, setTooltipTitle] = useState<ReactNode | null>(null);
  const [labelRef, labelIsTruncated] = useCSSTextTruncation<HTMLSpanElement>();
  const theme = useTheme();

  // Resolve committed value to display in the trigger label and tooltip
  useEffect(() => {
    if (value === NO_TIME_RANGE) {
      setActualTimeRange(NO_TIME_RANGE);
      setTooltipTitle(null);
      return;
    }
    fetchTimeRange(value).then(({ value: actual, error }) => {
      if (error) {
        setActualTimeRange(value);
        setTooltipTitle(null);
        return;
      }
      const isPreset = QUICK_PRESETS.some(p => p.value === value);
      if (isPreset) {
        setActualTimeRange(value);
        setTooltipTitle(
          labelIsTruncated ? (
            <div>
              <strong>{value}</strong>
              <div>{actual}</div>
            </div>
          ) : (
            actual || null
          ),
        );
      } else {
        setActualTimeRange(actual || value);
        setTooltipTitle(null);
      }
    });
  }, [value, labelIsTruncated]);

  function onOpen() {
    setTimeRangeValue(value);
    if (value === NO_TIME_RANGE) {
      setPickerValue(null);
    } else {
      fetchTimeRange(value).then(({ value: actual }) => {
        setPickerValue(actual ? parseActualRange(actual) : null);
      });
    }
    setShow(true);
    onOpenPopover();
  }

  function onHide() {
    setShow(false);
    onClosePopover();
  }

  function onSave() {
    onChange(timeRangeValue);
    setShow(false);
    onClosePopover();
  }

  const toggleOverlay = () => (show ? onHide() : onOpen());

  function handlePresetClick(presetValue: string) {
    setTimeRangeValue(presetValue);
    fetchTimeRange(presetValue).then(({ value: actual }) => {
      setPickerValue(actual ? parseActualRange(actual) : null);
    });
  }

  function handleRangeChange(dates: [Dayjs | null, Dayjs | null] | null) {
    if (!dates || !dates[0] || !dates[1]) {
      setTimeRangeValue(NO_TIME_RANGE);
      setPickerValue(null);
      return;
    }
    const [start, end] = dates;
    setPickerValue([start, end]);
    setTimeRangeValue(
      `${start.format(DATE_FORMAT)} : ${end.format(DATE_FORMAT)}`,
    );
  }

  const activePreset = QUICK_PRESETS.find(
    p => p.value === timeRangeValue,
  )?.value;

  const overlayContent = (
    <ContentStyleWrapper>
      <div className="section-title">{t('Quick select')}</div>
      <div className="presets">
        {QUICK_PRESETS.map(preset => (
          <PresetTag
            key={preset.value}
            active={activePreset === preset.value}
            onClick={() => handlePresetClick(preset.value)}
            role="button"
          >
            {preset.label}
          </PresetTag>
        ))}
        <PresetTag
          active={timeRangeValue === NO_TIME_RANGE}
          onClick={() => {
            setTimeRangeValue(NO_TIME_RANGE);
            setPickerValue(null);
          }}
          role="button"
          data-test={DateFilterTestKey.NoFilter}
        >
          {t('No filter')}
        </PresetTag>
      </div>
      <Divider />
      <RangePicker
        value={pickerValue}
        onChange={handleRangeChange}
        format={DATE_FORMAT}
        allowClear
        style={{ width: '100%' }}
        getPopupContainer={nodeTrigger =>
          isOverflowingFilterBar
            ? (nodeTrigger.parentNode as HTMLElement)
            : document.body
        }
      />
      <Divider />
      <div className="footer">
        <Button
          buttonStyle="secondary"
          cta
          key="cancel"
          onClick={onHide}
          data-test={DateFilterTestKey.CancelButton}
        >
          {t('CANCEL')}
        </Button>
        <Button
          buttonStyle="primary"
          cta
          key="apply"
          onClick={onSave}
          data-test={DateFilterTestKey.ApplyButton}
        >
          {t('APPLY')}
        </Button>
      </div>
    </ContentStyleWrapper>
  );

  const popoverContent = (
    <ControlPopover
      autoAdjustOverflow={false}
      trigger="click"
      placement="right"
      content={overlayContent}
      title={
        <IconWrapper>
          <Icons.EditOutlined />
          <span className="text">{t('Edit time range')}</span>
        </IconWrapper>
      }
      defaultOpen={show}
      open={show}
      onOpenChange={toggleOverlay}
      overlayStyle={{ width: '480px' }}
      destroyTooltipOnHide
      getPopupContainer={nodeTrigger =>
        isOverflowingFilterBar
          ? (nodeTrigger.parentNode as HTMLElement)
          : document.body
      }
      overlayClassName="time-range-popover"
    >
      <Tooltip placement="top" title={tooltipTitle}>
        <DateLabel
          name={name}
          aria-labelledby={`filter-name-${props.name}`}
          aria-describedby={`date-label-${props.name}`}
          label={actualTimeRange}
          isActive={show}
          isPlaceholder={actualTimeRange === NO_TIME_RANGE}
          data-test={DateFilterTestKey.PopoverOverlay}
          ref={labelRef}
        />
      </Tooltip>
    </ControlPopover>
  );

  return (
    <>
      <ControlHeader {...props} />
      {popoverContent}
    </>
  );
}
