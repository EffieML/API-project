import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux'
import { useEffect } from 'react';
import { listAllSpots } from '../../store/spots';
import './AllSpotsList.css';

function AllSpotsList() {
    const dispatch = useDispatch();
    const spots = Object.values(useSelector(state => state.spots.allSpots))
    console.log("AllSpotsList spots: ", spots)

    // const spots = Object.values(spots)

    useEffect(() => {
        dispatch(listAllSpots());
    }, [dispatch]);

    if (!spots) return null;


    // console.log("AllSpotsList spots: ", spots)

    // const spots = Object.values(allSpotsObj[0]);
    // console.log("AllSpotsList spots: ", spots)

    return (
        <div className='all-spots-list'>
            {spots && (
                spots.map(spot => (
                    <Link key={spot.id} to={`/spots/${spot.id}`}>
                        <div className='spot-card'>
                            <div >
                                <img src={spot.previewImage} alt='Spot preview image' />
                            </div>
                            <div className='spot-info'>
                                <div>
                                    {`${spot.city}, ${spot.state}`}
                                </div>
                                <div >
                                    <span>${spot.price} </span>night
                                </div>
                                <div>
                                    rating?
                                </div>
                            </div>
                        </div>
                    </Link>
                ))
            )}
        </div>
    )
}

export default AllSpotsList;
