import React from 'react';
import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import ProfileButton from './ProfileButton';
import LoginFormModal from '../LoginFormModal';
import SignupFormModal from '../SignupFormModal';
import './Navigation.css';

function Navigation({ isLoaded }) {
    const sessionUser = useSelector(state => state.session.user);

    let sessionLinks;
    if (sessionUser) {
        sessionLinks = (
            <ProfileButton user={sessionUser} />
        );
    } else {
        sessionLinks = (
            <>
                <LoginFormModal />
                <SignupFormModal />
                {/* <NavLink to="/signup">Sign Up</NavLink> */}
            </>
        );
    }


    //     return (
    //         <ul>
    //             <li>
    //                 <NavLink exact to="/">Home</NavLink>
    //                 {isLoaded && sessionLinks}
    //             </li>
    //         </ul>
    //     );
    // }

    return (
        <nav className='nav-bar'>
            <div className='nav-home'>
                <NavLink exact to="/">
                    {/* <img src='https://www.urbanbrush.net/web/wp-content/uploads/edd/2020/11/urbanbrush-20201127001119423145.jpg' /> */}
                    <div>Staybnb</div>
                </NavLink>
            </div>
            <div className='nav-login-signup'>
                <div>
                    {isLoaded && sessionLinks}
                </div>
            </div>
        </nav>
    );
}

export default Navigation;
