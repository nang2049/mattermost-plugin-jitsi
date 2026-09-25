import * as React from 'react';
import {afterEach, describe, expect, it, jest} from '@jest/globals';
import {act, render, screen} from '@testing-library/react';
import {IntlProvider} from 'react-intl';

import {Post, PostMetadata, PostType} from 'mattermost-redux/types/posts';

import Conference from './conference';

describe('Conference', () => {
    const basePost: Post = {
        id: 'test',
        create_at: 100,
        update_at: 100,
        edit_at: 100,
        delete_at: 100,
        message: 'test-message',
        is_pinned: false,
        user_id: 'test-user-id',
        channel_id: 'test-channel-id',
        root_id: '',
        parent_id: '',
        original_id: '',
        type: 'custom_jitsi' as PostType,
        hashtags: '',
        props: {
            jwt_meeting_valid_until: 123,
            meeting_link: 'http://test-meeting-link/test',
            jwt_meeting: true,
            meeting_jwt: 'xxxxxxxxxxxx',
            meeting_topic: 'Test topic',
            meeting_id: 'test',
            meeting_personal: false
        },
        metadata: {} as PostMetadata,
        pending_post_id: 'test',
        reply_count: 100
    };

    const actions = {
        openJitsiMeeting: jest.fn(),
        setUserStatus: jest.fn()
    };

    const defaultProps = {
        post: basePost,
        jwt: null,
        showPrejoinPage: false,
        actions,
        currentUser: {
            id: 'mockId',
            username: 'firstLast'
        }
    };

    Conference.prototype.getViewportWidth = () => 10;
    Conference.prototype.getViewportHeight = () => 10;
    Conference.prototype.componentDidUpdate = jest.fn();
    Conference.prototype.componentDidMount = jest.fn();
    Conference.prototype.componentWillUnmount = jest.fn();

    const renderConference = (props = {}) => {
        const ref = React.createRef<Conference>();
        const result = render(
            <IntlProvider locale='en'>
                <Conference
                    ref={ref}
                    {...defaultProps}
                    {...props}
                />
            </IntlProvider>
        );
        const instance = ref.current as Conference;
        const setState = (state: Partial<Conference['state']>) => act(() => {
            instance.setState(state as Conference['state']);
        });
        return {...result, instance, setState};
    };

    const visibleButtons = () => ['Move up', 'Move down', 'Maximize', 'Minimize', 'Open in new tab', 'Close'].
        filter((title) => screen.queryByTitle(title));

    const clickButton = (title: string) => act(() => screen.getByTitle(title).click());

    afterEach(() => {
        jest.useRealTimers();
    });

    it('should render null if the post type is null', () => {
        const {container} = renderConference({post: null});
        expect(container).toBeEmptyDOMElement();
    });

    it('should render and initialize the conference interface', () => {
        const {container, asFragment} = renderConference();
        expect(container.querySelector('#jitsiMeet')).toBeInTheDocument();
        expect(visibleButtons()).toEqual(['Move up', 'Maximize', 'Open in new tab', 'Close']);
        expect(screen.getByTitle('Open in new tab').closest('a')).toHaveAttribute('href', 'http://test-meeting-link/test#config.callDisplayName=%22Test%20topic%22');
        expect(asFragment()).toMatchSnapshot();
    });

    describe('should show the correct buttons depending on the state', () => {
        it('should have down, open outside, maximize and close buttons', () => {
            const {setState} = renderConference();
            setState({minimized: true, position: 'top'});
            expect(visibleButtons()).toEqual(['Move down', 'Maximize', 'Open in new tab', 'Close']);
        });

        it('should have up, open outside, maximize and close buttons', () => {
            const {setState} = renderConference();
            setState({minimized: true, position: 'bottom'});
            expect(visibleButtons()).toEqual(['Move up', 'Maximize', 'Open in new tab', 'Close']);
        });

        it('should have open outside, minimize and close buttons', () => {
            const {setState} = renderConference();
            setState({minimized: false});
            expect(visibleButtons()).toEqual(['Minimize', 'Open in new tab', 'Close']);
        });

        it('should toggle the position when clicking the move buttons', () => {
            renderConference();
            clickButton('Move up');
            expect(visibleButtons()).toEqual(['Move down', 'Maximize', 'Open in new tab', 'Close']);
            clickButton('Move down');
            expect(visibleButtons()).toEqual(['Move up', 'Maximize', 'Open in new tab', 'Close']);
        });
    });

    describe('should show the the loading spinner depending on the state', () => {
        it('should show loading', () => {
            const {container, setState} = renderConference();
            setState({loading: true});
            expect(container.querySelector('.spinner')).toBeInTheDocument();
        });

        it('should not show loading', () => {
            const {container, setState} = renderConference();
            setState({loading: false});
            expect(container.querySelector('.spinner')).not.toBeInTheDocument();
        });
    });

    describe('should maximize based on the state', () => {
        const expectMaximizeToggles = (command: string, wasKey: string, isKey: string) => {
            const {instance, setState} = renderConference();
            const executeCommand = jest.fn();
            instance.api = {executeCommand};
            const cases: Array<[boolean, boolean, boolean]> = [[true, true, false], [true, false, true], [false, true, true], [false, false, false]];
            for (const [was, is, toggled] of cases) {
                setState({[wasKey]: was, [isKey]: is});
                act(() => instance.maximize());
                if (toggled) {
                    expect(executeCommand).toBeCalledWith(command);
                } else {
                    expect(executeCommand).not.toBeCalledWith(command);
                }
                executeCommand.mockClear();
            }
        };

        it('should toggle tile only if was open before minimize and now is closed', () => {
            expectMaximizeToggles('toggleTileView', 'wasTileView', 'isTileView');
        });

        it('should toggle filmstrip only if was open before minimize and now is closed', () => {
            expectMaximizeToggles('toggleFilmStrip', 'wasFilmStrip', 'isFilmStrip');
        });
    });

    describe('should minimize based on the state', () => {
        const expectMinimizeToggles = (command: string, isKey: string) => {
            const {instance, setState} = renderConference();
            const executeCommand = jest.fn();
            instance.api = {executeCommand};

            setState({[isKey]: true});
            act(() => instance.minimize());
            expect(executeCommand).toBeCalledWith(command);
            executeCommand.mockClear();

            setState({[isKey]: false});
            act(() => instance.minimize());
            expect(executeCommand).not.toBeCalledWith(command);
        };

        it('should toggle tile only if is open before minimizing', () => {
            expectMinimizeToggles('toggleTileView', 'isTileView');
        });

        it('should toggle filmstrip only if is open before minimize', () => {
            expectMinimizeToggles('toggleFilmStrip', 'isFilmStrip');
        });
    });

    it('should execute the hangup command, wait and call the action to close the meeting, and reset the state on closed', () => {
        jest.useFakeTimers();
        const {instance, setState} = renderConference();
        setState({
            minimized: false,
            loading: false,
            position: 'top',
            wasTileView: false,
            isTileView: false,
            wasFilmStrip: false,
            isFilmStrip: false
        });
        const api = {
            executeCommand: jest.fn(),
            dispose: jest.fn()
        };
        instance.api = api;

        clickButton('Close');
        expect(defaultProps.actions.openJitsiMeeting).not.toBeCalled();
        expect(api.executeCommand).toBeCalledWith('hangup');

        act(() => {
            jest.advanceTimersByTime(200);
        });
        expect(defaultProps.actions.openJitsiMeeting).toBeCalledTimes(1);
        expect(defaultProps.actions.openJitsiMeeting).toBeCalledWith(null, null);
        expect(defaultProps.actions.setUserStatus).toBeCalledWith('mockId', 'online');
        expect(api.dispose).toBeCalled();
        expect(instance.state).toEqual({
            minimized: true,
            loading: true,
            position: 'bottom',
            wasTileView: true,
            isTileView: true,
            wasFilmStrip: true,
            isFilmStrip: true
        });

        instance.escFunction({keyCode: 27});
        expect(api.executeCommand).toBeCalledTimes(1);
    });

    it('should ignore Escape when no meeting is open', () => {
        const {instance} = renderConference();

        expect(() => instance.escFunction({keyCode: 27})).not.toThrow();
        expect(defaultProps.actions.openJitsiMeeting).not.toBeCalled();
        expect(defaultProps.actions.setUserStatus).not.toBeCalled();
    });

    it('should close the meeting on Escape when a meeting is open', () => {
        const {instance} = renderConference();
        const api = {executeCommand: jest.fn(), dispose: jest.fn()};
        instance.api = api;

        instance.escFunction({keyCode: 27});
        expect(api.executeCommand).toBeCalledWith('hangup');
    });
});
