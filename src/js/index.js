import Search from "./models/Search";
import Recipe from "./models/Recipe";
import List from "./models/List";
import Likes from "./models/Likes";
import * as searchView from './views/searchView';
import * as recipeView from './views/recipeView';
import * as listView from './views/listView';
import * as likesView from './views/likesView';
import { elements, renderLoader, clearLoader } from "./views/base";

/* Global state of the app
* - Search object
* - Current Recipe object
* - Shopping list object
* - Liked recipes
* */

const state = {};

/* Search Controller */
const controlSearch = async () => {
    // Get query from view
    const query = searchView.getInput();

    if (query) {
        // New search object and add to state
        state.search = new Search(query);

        // Prepare UI for results
        searchView.clearInput();
        searchView.clearResults();
        renderLoader(elements.searchRes);

        try {
            // Search for recipes
            await state.search.getResults();

            // Render results on UI
            clearLoader();
            searchView.renderResults(state.search.result);
        }
        catch (err) {
            alert('Could not find your search');
            clearLoader();
        }
    }
}

elements.searchForm.addEventListener('submit', e => {
    e.preventDefault();
    controlSearch();
});

elements.searchResPages.addEventListener('click', e => {
    const btn = e.target.closest('.btn-inline');
    if (btn) {
        const goToPage = parseInt(btn.dataset.goto, 10);
        searchView.clearResults();
        searchView.renderResults(state.search.result, goToPage);
    }
});

/* Recipe Controller */
const controlRecipe = async () => {
    // Get id from url
    const id = window.location.hash.replace('#', '');

    if (id) {
        // Prepare UI for changes
        recipeView.clearRecipe();
        renderLoader(elements.recipe);

        // Highlight selected search item
        if (state.search) searchView.highlightSelected(id);

        // Create new recipe object
        state.recipe = new Recipe(id);

        try {
            // Get recipe data and parse ingredients
            await state.recipe.getRecipe();
            state.recipe.parseIngredients();

            // Calculate servings and time
            state.recipe.calcTime();
            state.recipe.calcServings();

            // Render Recipe
            clearLoader();
            recipeView.renderRecipe(
                state.recipe,
                state.likes.isLiked(id)
            );
        }
        catch (err) {
            alert('Could not find recipe');
            console.error(err);
        }
    }
};

['hashchange', 'load'].forEach(event => window.addEventListener(event, controlRecipe));

/* List Controller */
const controlList = () => {
    // Create a new list if there is none yet
    if (!state.list) state.list = new List();

    // Add each ingredient to the list and UI
    state.recipe.ingredients.forEach(el => {
        const item = state.list.addItem(el.count, el.unit, el.ingredient);
        listView.renderItem(item);
    });
};

// Handle delete and update list item events
elements.shopping.addEventListener('click', e => {
    const id = e.target.closest('.shopping__item').dataset.itemid;

    // Handle the delete event
    if (e.target.matches('.shopping__delete, .shopping__delete *')) {
        // Delete from state
        state.list.deleteItem(id);

        // Delete from UI
        listView.deleteItem(id);
    }
    else if (e.target.matches('.shopping__count-value')) {
        // Handle count update
        const val = parseFloat(e.target.value, 10);
        state.list.updateCount(id, val);

    }
});

/* Like Controller */
const controlLike = () => {
    if (!state.likes) state.likes = new Likes();

    const curRecipe = state.recipe;
    if (!state.likes.isLiked(curRecipe.id)) {
        // Add like to the state
        const newLike = state.likes.addLikes(
            curRecipe.id,
            curRecipe.title,
            curRecipe.author,
            curRecipe.img
        );

        // Toggle the like button
        likesView.toggleLikeBtn(true);

        // Add like to UI list
        likesView.renderLike(newLike);

    }
    else {
        // Remove like from the state
        state.likes.deleteLike(curRecipe.id);

        // Toggle the like button
        likesView.toggleLikeBtn(false);

        // Remove like from UI list
        likesView.deleteLike(curRecipe.id);
    }
    likesView.toggleLikeMenu(state.likes.getNumLikes());
};

// Restore liked recipes on page load
window.addEventListener('load', () => {
    state.likes = new Likes();
    state.likes.readStorage();
    likesView.toggleLikeMenu(state.likes.getNumLikes());
    state.likes.likes.forEach(like => likesView.renderLike(like));
});

// Handling recipe button clicks
elements.recipe.addEventListener('click', e => {
    if (e.target.matches('.btn-decrease, .btn-decrease *')) {
        // Decrease button is clicked
        if (state.recipe.servings > 1) {
            state.recipe.updateServings('dec');
            recipeView.updateServingsIngredients(state.recipe);
        }
    }
    else if (e.target.matches('.btn-increase, .btn-increase *')) {
        // Increase button is clicked
        state.recipe.updateServings('inc');
        recipeView.updateServingsIngredients(state.recipe);
    }
    else if (e.target.matches('.recipe__btn-add, recipe__btn-add *')) {
        controlList();
    }
    else if (e.target.matches('.recipe__love, .recipe__love *')) {
        // Like controller
        controlLike();
    }
});