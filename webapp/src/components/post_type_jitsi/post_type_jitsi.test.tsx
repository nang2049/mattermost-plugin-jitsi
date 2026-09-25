import * as React from 'react';
import {jest, describe, expect, it} from '@jest/globals';
import {act, fireEvent, render, screen} from '@testing-library/react';
import {IntlProvider} from 'react-intl';

import {Post} from 'mattermost-redux/types/posts';

import {PostTypeJitsi} from './post_type_jitsi';
import Constants from 'mattermost-redux/constants/general';

describe('PostTypeJitsi', () => {
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
        type: 'custom_jitsi',
        hashtags: '',
        pending_post_id: '',
        reply_count: 0,
        metadata: {
            embeds: [],
            emojis: [],
            files: [],
            images: {},
            reactions: []
        },
        props: {
            jwt_meeting_valid_until: 123,
            meeting_link: 'http://test-meeting-link/test',
            jwt_meeting: true,
            meeting_jwt: 'xxxxxxxxxxxx',
            meeting_topic: 'Test topic',
            meeting_id: 'test',
            meeting_personal: false
        }
    };

    const actions = {
        enrichMeetingJwt: jest.fn().mockImplementation(() => Promise.resolve({data: {jwt: 'test-enriched-jwt'}})),
        openJitsiMeeting: jest.fn(),
        setUserStatus: jest.fn().mockImplementation(() => Promise.resolve({data: {user_id: 'test-user-id', status: Constants.DND}}))
    };

    const theme = {
        buttonColor: '#fabada'
    };

    const defaultProps = {
        post: basePost,
        theme,
        creatorName: 'test',
        currentUser: {
            id: 'test-user-id',
            first_name: 'First',
            last_name: 'Last',
            username: 'firstLast'
        },
        useMilitaryTime: false,
        meetingEmbedded: false,
        actions
    };

    const withProps = (postProps: Record<string, unknown>) => ({
        ...defaultProps,
        post: {
            ...defaultProps.post,
            props: {
                ...defaultProps.post.props,
                ...postProps
            }
        }
    });

    const renderPost = async (props: any = defaultProps) => {
        let result: ReturnType<typeof render> | undefined;
        await act(async () => {
            result = render(
                <IntlProvider locale='en'>
                    <PostTypeJitsi {...props}/>
                </IntlProvider>
            );
        });
        return result as ReturnType<typeof render>;
    };

    const joinButton = () => screen.getByText('JOIN MEETING').closest('a') as HTMLAnchorElement;

    it('should render null if the post type is null', async () => {
        const props = {...defaultProps, post: null};
        const {container} = await renderPost(props);
        expect(container).toBeEmptyDOMElement();
        expect(defaultProps.actions.enrichMeetingJwt).not.toBeCalled();
    });

    it('should render a post if the post type is not null, and should try to enrich the token', async () => {
        const {asFragment} = await renderPost();
        expect(defaultProps.actions.enrichMeetingJwt).toBeCalledWith('xxxxxxxxxxxx');
        expect(screen.getByText('test has started a meeting')).toBeInTheDocument();
        expect(screen.getByRole('heading', {level: 1})).toHaveTextContent('Test topic');
        expect(screen.getByText('Meeting ID:')).toBeInTheDocument();
        expect(screen.getByText('Meeting link valid until:')).toBeInTheDocument();
        expect(joinButton()).toHaveAttribute('href', 'http://test-meeting-link/test?jwt=xxxxxxxxxxxx#config.callDisplayName=%22Test%20topic%22&userInfo.displayName=%22firstLast%22');
        expect(screen.getByRole('link', {name: 'test'})).toHaveAttribute('href', joinButton().getAttribute('href'));
        expect(asFragment()).toMatchSnapshot();
    });

    it('should render a post without token if there is no jwt token, and shouldn\'t try to enrich the token', async () => {
        const {asFragment} = await renderPost(withProps({jwt_meeting: false}));
        expect(defaultProps.actions.enrichMeetingJwt).not.toBeCalled();
        expect(screen.queryByText('Meeting link valid until:')).not.toBeInTheDocument();
        expect(joinButton()).toHaveAttribute('href', 'http://test-meeting-link/test#config.callDisplayName=%22Test%20topic%22&userInfo.displayName=%22firstLast%22');
        expect(asFragment()).toMatchSnapshot();
    });

    it('should render the default topic if the topic is empty', async () => {
        await renderPost(withProps({meeting_topic: null}));
        expect(screen.getByRole('heading', {level: 1})).toHaveTextContent('Jitsi Meeting');
    });

    it('should render the a different subtitle if the meeting is personal', async () => {
        await renderPost(withProps({meeting_personal: true}));
        expect(screen.getByText('Personal Meeting ID (PMI):')).toBeInTheDocument();
        expect(screen.queryByText('Meeting ID:')).not.toBeInTheDocument();
    });

    it('should prevent the default link behavior and call the action to open jitsi if embedded is true', async () => {
        await renderPost({...defaultProps, meetingEmbedded: true});
        const notPrevented = fireEvent.click(joinButton());
        expect(notPrevented).toBe(false);
        expect(defaultProps.actions.setUserStatus).toBeCalledWith('test-user-id', Constants.DND);
        expect(defaultProps.actions.openJitsiMeeting).toBeCalledWith(basePost, 'test-enriched-jwt');
    });

    it('should not prevent the default link behavior and should not call the action to open jitsi if embedded is false', async () => {
        defaultProps.actions.enrichMeetingJwt.mockImplementationOnce(() => Promise.resolve({}));
        await renderPost({...defaultProps, meetingEmbedded: false});
        const notPrevented = fireEvent.click(joinButton());
        expect(notPrevented).toBe(true);
        expect(defaultProps.actions.openJitsiMeeting).not.toBeCalled();
    });
});
