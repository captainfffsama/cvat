// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useEffect, useState } from 'react';
import { RouteComponentProps } from 'react-router';
import { withRouter } from 'react-router-dom';
import { Row, Col } from 'antd/lib/grid';
import Icon from 'antd/lib/icon';
import Table from 'antd/lib/table';
import Button from 'antd/lib/button';
import Tooltip from 'antd/lib/tooltip';
import Text from 'antd/lib/typography/Text';
import moment from 'moment';
import copy from 'copy-to-clipboard';

import getCore from 'cvat-core-wrapper';
import UserSelector from './user-selector';

const core = getCore();

const baseURL = core.config.backendAPI.slice(0, -7);

interface Props {
    taskInstance: any;
    registeredUsers: any[];
    onJobUpdate(jobInstance: any): void;
}

function ReviewSummaryComponent({ jobInstance }: { jobInstance: any }): JSX.Element {
    const [summary, setSummary] = useState<Record<string, any> | null>(null);
    const [error, setError] = useState<any>(null);
    useEffect(() => {
        setError(null);
        jobInstance
            .reviewsSummary()
            .then((_summary: Record<string, any>) => {
                setSummary(_summary);
            })
            .catch((_error: any) => {
                // eslint-disable-next-line
                console.log(_error);
                setError(_error);
            });
    }, []);

    if (!summary) {
        if (error) {
            return <p>Could not fetch, check console output</p>;
        }

        return (
            <>
                <p>Loading.. </p>
                <Icon type='loading' />
            </>
        );
    }

    return (
        <table className='cvat-review-summary-description'>
            <tbody>
                <tr>
                    <td>
                        <Text strong>Reviews</Text>
                    </td>
                    <td>{summary.reviews}</td>
                </tr>
                <tr>
                    <td>
                        <Text strong>Average quality</Text>
                    </td>
                    <td>{summary.average_estimated_quality}</td>
                </tr>
                <tr>
                    <td>
                        <Text strong>Unsolved issues</Text>
                    </td>
                    <td>{summary.issues_unsolved}</td>
                </tr>
                <tr>
                    <td>
                        <Text strong>Resolved issues</Text>
                    </td>
                    <td>{summary.issues_resolved}</td>
                </tr>
            </tbody>
        </table>
    );
}

function JobListComponent(props: Props & RouteComponentProps): JSX.Element {
    const {
        taskInstance,
        registeredUsers,
        onJobUpdate,
        history: { push },
    } = props;

    const { jobs, id: taskId } = taskInstance;
    const columns = [
        {
            title: 'Job',
            dataIndex: 'job',
            key: 'job',
            render: (id: number): JSX.Element => (
                <div>
                    <Button
                        type='link'
                        onClick={(e: React.MouseEvent): void => {
                            e.preventDefault();
                            push(`/tasks/${taskId}/jobs/${id}`);
                        }}
                        href={`/tasks/${taskId}/jobs/${id}`}
                    >
                        {`Job #${id}`}
                    </Button>
                </div>
            ),
        },
        {
            title: 'Frames',
            dataIndex: 'frames',
            key: 'frames',
            className: 'cvat-text-color',
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            className: 'cvat-job-item-status',
            render: (jobInstance: any): JSX.Element => {
                const { status } = jobInstance;
                let progressColor = null;
                if (status === 'completed') {
                    progressColor = 'cvat-job-completed-color';
                } else if (status === 'validation') {
                    progressColor = 'cvat-job-validation-color';
                } else {
                    progressColor = 'cvat-job-annotation-color';
                }

                return (
                    <Text strong className={progressColor}>
                        {status}
                        <Tooltip title={<ReviewSummaryComponent jobInstance={jobInstance} />}>
                            <Icon type='question-circle' />
                        </Tooltip>
                    </Text>
                );
            },
        },
        {
            title: 'Started on',
            dataIndex: 'started',
            key: 'started',
            className: 'cvat-text-color',
        },
        {
            title: 'Duration',
            dataIndex: 'duration',
            key: 'duration',
            className: 'cvat-text-color',
        },
        {
            title: 'Assignee',
            dataIndex: 'assignee',
            key: 'assignee',
            render: (jobInstance: any): JSX.Element => {
                const assignee = jobInstance.assignee ? jobInstance.assignee.username : null;

                return (
                    <UserSelector
                        className='cvat-job-assignee-selector'
                        style={{ marginLeft: 0 }}
                        users={registeredUsers}
                        value={assignee}
                        onChange={(value: string): void => {
                            let [userInstance] = [...registeredUsers].filter((user: any) => user.username === value);

                            if (userInstance === undefined) {
                                userInstance = null;
                            }

                            // eslint-disable-next-line
                            jobInstance.assignee = userInstance;
                            onJobUpdate(jobInstance);
                        }}
                    />
                );
            },
        },
        {
            title: 'Reviewer',
            dataIndex: 'reviewer',
            key: 'reviewer',
            render: (jobInstance: any): JSX.Element => {
                const reviewer = jobInstance.reviewer ? jobInstance.reviewer.username : null;

                return (
                    <UserSelector
                        className='cvat-job-reviewer-selector'
                        style={{ marginLeft: 0 }}
                        users={registeredUsers}
                        value={reviewer}
                        onChange={(value: string): void => {
                            let [userInstance] = [...registeredUsers].filter((user: any) => user.username === value);

                            if (userInstance === undefined) {
                                userInstance = null;
                            }

                            // eslint-disable-next-line
                            jobInstance.reviewer = userInstance;
                            onJobUpdate(jobInstance);
                        }}
                    />
                );
            },
        },
    ];

    let completed = 0;
    const data = jobs.reduce((acc: any[], job: any) => {
        if (job.status === 'completed') {
            completed++;
        }

        const created = moment(props.taskInstance.createdDate);

        acc.push({
            key: job.id,
            job: job.id,
            frames: `${job.startFrame}-${job.stopFrame}`,
            status: job,
            started: `${created.format('MMMM Do YYYY HH:MM')}`,
            duration: `${moment.duration(moment(moment.now()).diff(created)).humanize()}`,
            assignee: job,
            reviewer: job,
        });

        return acc;
    }, []);

    return (
        <div className='cvat-task-job-list'>
            <Row type='flex' justify='space-between' align='middle'>
                <Col>
                    <Text className='cvat-text-color cvat-jobs-header'> Jobs </Text>
                    <Tooltip trigger='click' title='Copied to clipboard!' mouseLeaveDelay={0}>
                        <Button
                            type='link'
                            onClick={(): void => {
                                let serialized = '';
                                const [latestJob] = [...taskInstance.jobs].reverse();
                                for (const job of taskInstance.jobs) {
                                    serialized += `Job #${job.id}`.padEnd(`${latestJob.id}`.length + 6, ' ');
                                    serialized += `: ${baseURL}/?id=${job.id}`.padEnd(
                                        `${latestJob.id}`.length + baseURL.length + 8,
                                        ' ',
                                    );
                                    serialized += `: [${job.startFrame}-${job.stopFrame}]`.padEnd(
                                        `${latestJob.startFrame}${latestJob.stopFrame}`.length + 5,
                                        ' ',
                                    );

                                    if (job.assignee) {
                                        serialized += `\t assigned to: ${job.assignee.username}`;
                                    }
                                    serialized += '\n';
                                }
                                copy(serialized);
                            }}
                        >
                            <Icon type='copy' theme='twoTone' />
                            Copy
                        </Button>
                    </Tooltip>
                </Col>
                <Col>
                    <Text className='cvat-text-color'>{`${completed} of ${data.length} jobs`}</Text>
                </Col>
            </Row>
            <Table className='cvat-task-jobs-table' columns={columns} dataSource={data} size='small' />
        </div>
    );
}

export default withRouter(JobListComponent);
