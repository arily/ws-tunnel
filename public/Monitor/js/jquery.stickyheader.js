$(function () {
  $('table').each(function () {
    if ($(this).find('thead').length > 0 && $(this).find('th').length > 0) {
      // Clone <thead>
      const $w = $(window)
      const $t = $(this)
      const $thead = $t.find('thead').clone()
      const $col = $t.find('thead, tbody').clone()

      // Add class, remove margins, reset width and wrap table
      $t
        .addClass('sticky-enabled')
        .css({
          margin: 0,
          width: '100%'
        }).wrap('<div class="sticky-wrap" />')

      if ($t.hasClass('overflow-y')) $t.removeClass('overflow-y').parent().addClass('overflow-y')

      // Create new sticky table head (basic)
      $t.after('<table class="sticky-thead" />')

      // If <tbody> contains <th>, then we create sticky column and intersect (advanced)
      if ($t.find('tbody th').length > 0) {
        $t.after('<table class="sticky-col" /><table class="sticky-intersect" />')
      }

      // Create shorthand for things
      const $stickyHead = $(this).siblings('.sticky-thead')
      const $stickyCol = $(this).siblings('.sticky-col')
      const $stickyInsct = $(this).siblings('.sticky-intersect')
      const $stickyWrap = $(this).parent('.sticky-wrap')

      $stickyHead.append($thead)

      $stickyCol
        .append($col)
        .find('thead th:gt(0)').remove()
        .end()
        .find('tbody td').remove()

      $stickyInsct.html('<thead><tr><th>' + $t.find('thead th:first-child').html() + '</th></tr></thead>')

      // Set widths
      const setWidths = function () {
        $t
          .find('thead th').each(function (i) {
            $stickyHead.find('th').eq(i).width($(this).width())
          })
          .end()
          .find('tr').each(function (i) {
            $stickyCol.find('tr').eq(i).height($(this).height())
          })

        // Set width of sticky table head
        $stickyHead.width($t.width())

        // Set width of sticky table col
        $stickyCol.find('th').add($stickyInsct.find('th')).width($t.find('thead th').width())
      }
      const repositionStickyHead = function () {
        // Return value of calculated allowance
        const allowance = calcAllowance()

        // Check if wrapper parent is overflowing along the y-axis
        if ($t.height() > $stickyWrap.height()) {
          // If it is overflowing (advanced layout)
          // Position sticky header based on wrapper scrollTop()
          if ($stickyWrap.scrollTop() > 0) {
            // When top of wrapping parent is out of view
            $stickyHead.add($stickyInsct).css({
              opacity: 1,
              top: $stickyWrap.scrollTop()
            })
          } else {
            // When top of wrapping parent is in view
            $stickyHead.add($stickyInsct).css({
              opacity: 0,
              top: 0
            })
          }
        } else {
          // If it is not overflowing (basic layout)
          // Position sticky header based on viewport scrollTop
          if ($w.scrollTop() > $t.offset().top && $w.scrollTop() < $t.offset().top + $t.outerHeight() - allowance) {
            // When top of viewport is in the table itself
            $stickyHead.add($stickyInsct).css({
              opacity: 1,
              top: $w.scrollTop() - $t.offset().top
            })
          } else {
            // When top of viewport is above or below table
            $stickyHead.add($stickyInsct).css({
              opacity: 0,
              top: 0
            })
          }
        }
      }
      const repositionStickyCol = function () {
        if ($stickyWrap.scrollLeft() > 0) {
          // When left of wrapping parent is out of view
          $stickyCol.add($stickyInsct).css({
            opacity: 1,
            left: $stickyWrap.scrollLeft()
          })
        } else {
          // When left of wrapping parent is in view
          $stickyCol
            .css({ opacity: 0 })
            .add($stickyInsct).css({ left: 0 })
        }
      }
      const calcAllowance = function () {
        let a = 0
        // Calculate allowance
        $t.find('tbody tr:lt(3)').each(function () {
          a += $(this).height()
        })

        // Set fail safe limit (last three row might be too tall)
        // Set arbitrary limit at 0.25 of viewport height, or you can use an arbitrary pixel value
        if (a > $w.height() * 0.25) {
          a = $w.height() * 0.25
        }

        // Add the height of sticky header
        a += $stickyHead.height()
        return a
      }

      setWidths()

      $t.parent('.sticky-wrap').scroll($.throttle(250, function () {
        repositionStickyHead()
        repositionStickyCol()
      }))

      $w
        .load(setWidths)
        .resize($.debounce(250, function () {
          setWidths()
          repositionStickyHead()
          repositionStickyCol()
        }))
        .scroll($.throttle(250, repositionStickyHead))
    }
  })
})
