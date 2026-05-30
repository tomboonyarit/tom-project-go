package handler

import (
	"net/http"

	"api/models"
	"api/repository"
)

type CartHandler struct {
	cartRepo     *repository.CartRepo
	cartItemRepo *repository.CartItemRepo
}

func NewCartHandler(cartRepo *repository.CartRepo, cartItemRepo *repository.CartItemRepo) *CartHandler {
	return &CartHandler{
		cartRepo:     cartRepo,
		cartItemRepo: cartItemRepo,
	}
}

// GetCart handles GET /api/cart
func (h *CartHandler) GetCart(w http.ResponseWriter, r *http.Request) {
	userID := GetUserID(r)
	cart, err := h.cartRepo.FindByCustomer(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Database error")
		return
	}
	if cart == nil {
		// Return empty cart
		writeJSON(w, http.StatusOK, map[string]interface{}{
			"items": []models.CartItem{},
		})
		return
	}

	items, err := h.cartItemRepo.ListByCart(r.Context(), cart.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Database error")
		return
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"cart":  cart,
		"items": items,
	})
}

// AddItem handles POST /api/cart/items
func (h *CartHandler) AddItem(w http.ResponseWriter, r *http.Request) {
	var input models.AddCartItemInput
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "Invalid request body")
		return
	}

	userID := GetUserID(r)
	cart, err := h.cartRepo.GetOrCreate(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Failed to get/create cart")
		return
	}

	item, err := h.cartItemRepo.Add(r.Context(), cart.ID, input)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Failed to add item to cart")
		return
	}
	writeJSON(w, http.StatusCreated, item)
}

// UpdateItem handles PUT /api/cart/items/{id}
func (h *CartHandler) UpdateItem(w http.ResponseWriter, r *http.Request) {
	itemID := r.PathValue("id")
	var input models.UpdateCartItemInput
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, http.StatusBadRequest, "bad_request", "Invalid request body")
		return
	}

	item, err := h.cartItemRepo.Update(r.Context(), itemID, input)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Failed to update cart item")
		return
	}
	if item == nil {
		writeError(w, http.StatusNotFound, "not_found", "Cart item not found")
		return
	}
	writeJSON(w, http.StatusOK, item)
}

// RemoveItem handles DELETE /api/cart/items/{id}
func (h *CartHandler) RemoveItem(w http.ResponseWriter, r *http.Request) {
	itemID := r.PathValue("id")
	if err := h.cartItemRepo.Delete(r.Context(), itemID); err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Failed to remove item")
		return
	}
	writeMessage(w, http.StatusOK, "Item removed from cart")
}

// ClearCart handles DELETE /api/cart
func (h *CartHandler) ClearCart(w http.ResponseWriter, r *http.Request) {
	userID := GetUserID(r)
	cart, err := h.cartRepo.FindByCustomer(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Database error")
		return
	}
	if cart == nil {
		writeMessage(w, http.StatusOK, "Cart is already empty")
		return
	}

	if err := h.cartRepo.Clear(r.Context(), cart.ID); err != nil {
		writeError(w, http.StatusInternalServerError, "server_error", "Failed to clear cart")
		return
	}
	writeMessage(w, http.StatusOK, "Cart cleared")
}
